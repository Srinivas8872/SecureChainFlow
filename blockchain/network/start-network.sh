#!/usr/bin/env bash
# ==============================================================================
# SecureChainFlow: Local Hyperledger Fabric Test Network Bootstrap Script
# Starts Fabric test-network with 2 organizations, CouchDB state, and CA support
# ==============================================================================

set -euo pipefail

CHANNEL_NAME="mychannel"
CHAINCODE_NAME="securechainflow"

echo "=== 1. Starting Hyperledger Fabric Test Network ==="
if [ -d "../fabric-samples/test-network" ]; then
  cd ../fabric-samples/test-network
  ./network.sh down
  ./network.sh up createChannel -c "${CHANNEL_NAME}" -ca -s couchdb
  echo "Fabric network successfully started with channel '${CHANNEL_NAME}'"
else
  echo "Note: fabric-samples repository not detected locally."
  echo "Download Fabric binaries and test-network via:"
  echo "  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh"
  echo "  ./install-fabric.sh docker binary samples"
fi
