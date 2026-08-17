import { createPublicClient, decodeFunctionResult, encodeFunctionData, getAddress, http, keccak256, stringToHex, toHex, type Hex, type TransactionReceipt } from "viem";

import { createSupabaseAdmin } from "@navi/database";
import { readMonitoringConfig } from "./config.ts";

const executorAbi=[
  { type:"function", name:"paused", stateMutability:"view", inputs:[], outputs:[{ type:"bool" }] },
  { type:"function", name:"owner", stateMutability:"view", inputs:[], outputs:[{ type:"address" }] },
] as const;

const monitoredEventTopics=new Map([
  [keccak256(stringToHex("AdapterApprovalSet(address,bool)")),"ADAPTER_APPROVAL_CHANGED"],
  [keccak256(stringToHex("OwnershipTransferStarted(address,address)")),"OWNERSHIP_TRANSFER_STARTED"],
  [keccak256(stringToHex("OwnershipTransferred(address,address)")),"OWNERSHIP_CHANGED"],
  [keccak256(stringToHex("Paused(address)")),"EXECUTOR_PAUSED"],
  [keccak256(stringToHex("Unpaused(address)")),"EXECUTOR_UNPAUSED"],
]);

interface ReceiptClient { getTransactionReceipt(input:{hash:Hex}):Promise<TransactionReceipt> }

export interface MonitoringReport {
  status:"healthy"|"degraded";
  source:string;
  retrievedAt:string;
  chainId:number|null;
  blockNumber:string|null;
  blockAgeSeconds:number|null;
  latencyMs:number;
  executor:{ address:string; bytecodePresent:boolean; paused:boolean|null; owner:string|null };
  policyManager:{ address:string; bytecodePresent:boolean };
  configurationEvents:string[];
  receipts:{ checked:number; confirmed:number; failed:number; pending:number };
  alertDelivery:"not-needed"|"sent"|"not-configured"|"failed";
  issues:string[];
}

export function evaluateExecutorState(input:{chainId:number;expectedChainId:number;blockAgeSeconds:number;executorCode:Hex;policyCode:Hex;paused:boolean;owner:string;expectedOwner:string}) {
  const issues:string[]=[];
  if (input.chainId!==input.expectedChainId) issues.push("WRONG_NETWORK");
  if (input.blockAgeSeconds>120) issues.push("STALE_BLOCK");
  if (input.executorCode==="0x") issues.push("EXECUTOR_BYTECODE_MISSING");
  if (input.policyCode==="0x") issues.push("POLICY_MANAGER_BYTECODE_MISSING");
  if (!input.paused) issues.push("EXECUTOR_UNEXPECTEDLY_UNPAUSED");
  if (input.owner.toLowerCase()!==input.expectedOwner.toLowerCase()) issues.push("EXECUTOR_OWNER_CHANGED");
  return issues;
}

export async function runMonitoringProbe():Promise<MonitoringReport> {
  const config=readMonitoringConfig();
  const started=Date.now();
  const retrievedAt=new Date().toISOString();
  const executorAddress=getAddress(config.NAVI_EXECUTOR_ADDRESS);
  const policyManagerAddress=getAddress(config.NAVI_POLICY_MANAGER_ADDRESS);
  const expectedOwner=getAddress(config.EXPECTED_EXECUTOR_OWNER);
  const client=createPublicClient({ transport:http(config.rpcUrl, { timeout:8_000, retryCount:1 }) });
  const database=createSupabaseAdmin(config.SUPABASE_URL,config.SUPABASE_SECRET_KEY);
  const issues:string[]=[];
  let chainId:number|null=null;
  let blockNumber:bigint|null=null;
  let blockAgeSeconds:number|null=null;
  let executorCode:`0x${string}`="0x";
  let policyCode:`0x${string}`="0x";
  let paused:boolean|null=null;
  let owner:string|null=null;
  let configurationEvents:string[]=[];
  let receipts={ checked:0, confirmed:0, failed:0, pending:0 };

  try {
    const [observedChainId,block,observedExecutorCode,observedPolicyCode,observedPaused,observedOwner]=await Promise.all([
      client.getChainId(), client.getBlock(), client.getBytecode({ address:executorAddress }), client.getBytecode({ address:policyManagerAddress }),
      client.call({ to:executorAddress, data:encodeFunctionData({ abi:executorAbi, functionName:"paused" }) }),
      client.call({ to:executorAddress, data:encodeFunctionData({ abi:executorAbi, functionName:"owner" }) }),
    ]);
    chainId=observedChainId;
    blockNumber=block.number;
    blockAgeSeconds=Math.max(0,Math.floor(Date.now()/1_000-Number(block.timestamp)));
    executorCode=observedExecutorCode??"0x";
    policyCode=observedPolicyCode??"0x";
    paused=decodeFunctionResult({ abi:executorAbi, functionName:"paused", data:observedPaused.data??"0x" });
    owner=getAddress(decodeFunctionResult({ abi:executorAbi, functionName:"owner", data:observedOwner.data??"0x" }));
    issues.push(...evaluateExecutorState({ chainId,expectedChainId:config.chainId,blockAgeSeconds,executorCode,policyCode,paused,owner,expectedOwner }));

    const { data:previous }=await database.from("monitoring_checks").select("block_number").eq("network",config.NAVI_NETWORK).order("created_at",{ascending:false}).limit(1).maybeSingle();
    const previousBlock=previous?.block_number ? BigInt(previous.block_number) : block.number;
    if (previousBlock<block.number) {
      const logs=await client.request({ method:"eth_getLogs", params:[{ address:executorAddress, fromBlock:toHex(previousBlock+1n), toBlock:toHex(block.number) }] }) as Array<{topics:Hex[]}>;
      configurationEvents=logs.flatMap(log=>{
        const topic=log.topics[0];
        const label=topic ? monitoredEventTopics.get(topic) : undefined;
        return label ? [label] : [];
      });
      for (const event of configurationEvents) if (event!=="EXECUTOR_PAUSED") issues.push(event);
    }
    receipts=await reconcileSubmittedReceipts(database,client,config.chainId,block.number,config.RECEIPT_CONFIRMATIONS,retrievedAt);
  } catch (error) {
    issues.push(error instanceof Error ? `PROBE_FAILED:${error.message.split(":")[0]}` : "PROBE_FAILED:UNKNOWN");
  }

  const report:MonitoringReport={
    status:issues.length?"degraded":"healthy", source:"NAVI_MONITORING_PROBE", retrievedAt, chainId,
    blockNumber:blockNumber?.toString()??null, blockAgeSeconds, latencyMs:Date.now()-started,
    executor:{ address:executorAddress, bytecodePresent:executorCode!=="0x", paused, owner },
    policyManager:{ address:policyManagerAddress, bytecodePresent:policyCode!=="0x" }, configurationEvents, receipts,
    alertDelivery:"not-needed", issues,
  };
  if (issues.length) report.alertDelivery=await deliverAlert(config.MONITORING_WEBHOOK_URL,report);
  const { error:insertError }=await database.from("monitoring_checks").insert({
    network:config.NAVI_NETWORK, chain_id:chainId, block_number:report.blockNumber, status:report.status,
    source:report.source, retrieved_at:report.retrievedAt, details:report,
  });
  if (insertError) throw new Error(`MONITORING_STORE_FAILED:${insertError.code}`);
  return report;
}

async function reconcileSubmittedReceipts(database:ReturnType<typeof createSupabaseAdmin>,client:ReceiptClient,chainId:number,latestBlock:bigint,confirmations:number,retrievedAt:string) {
  const result={ checked:0, confirmed:0, failed:0, pending:0 };
  const { data,error }=await database.from("executions").select("id,tx_hash").eq("chain_id",chainId).eq("status","SUBMITTED").not("tx_hash","is",null).limit(50);
  if (error) throw new Error(`RECEIPT_QUEUE_READ_FAILED:${error.code}`);
  for (const row of data??[]) {
    result.checked++;
    try {
      const receipt=await client.getTransactionReceipt({ hash:row.tx_hash as `0x${string}` });
      const depth=latestBlock>=receipt.blockNumber ? latestBlock-receipt.blockNumber+1n : 0n;
      if (depth<BigInt(confirmations)) { result.pending++; continue; }
      const status=receipt.status==="success"?"CONFIRMED":"FAILED";
      const { error:updateError }=await database.from("executions").update({
        status, confirmed_at:retrievedAt, receipt_source:"X_LAYER_RPC_RECEIPT", receipt_retrieved_at:retrievedAt,
        receipt_block_number:receipt.blockNumber.toString(), receipt_block_hash:receipt.blockHash,
      }).eq("id",row.id).eq("status","SUBMITTED");
      if (updateError) throw new Error(`RECEIPT_UPDATE_FAILED:${updateError.code}`);
      if (status==="CONFIRMED") result.confirmed++; else result.failed++;
    } catch (error) {
      if (error instanceof Error && /not found|could not be found/i.test(error.message)) result.pending++;
      else throw error;
    }
  }
  return result;
}

async function deliverAlert(url:string|undefined,report:MonitoringReport):Promise<MonitoringReport["alertDelivery"]> {
  if (!url) return "not-configured";
  try {
    const response=await fetch(url,{ method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ event:"NAVI_MONITORING_ALERT", report }), signal:AbortSignal.timeout(8_000) });
    return response.ok?"sent":"failed";
  } catch {
    return "failed";
  }
}
