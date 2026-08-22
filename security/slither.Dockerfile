FROM trailofbits/eth-security-toolbox@sha256:365282b8d03ab03f387fefadbcf3858e82d967597e90a17cf4879b3efb475764

RUN /root/.crytic/bin/pip install --no-cache-dir --upgrade slither-analyzer==0.11.6

ENTRYPOINT ["/root/.crytic/bin/slither"]
