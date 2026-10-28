#!/usr/bin/env bash
# ==============================================================================
# SecureChainFlow: Chaincode Deployment Script
# Packages, installs, approves, and commits securechainflow smart contract
# ==============================================================================

set -euo pipefail

CHANNEL_NAME="mychannel"
CC_NAME="securechainflow"
CC_SRC_PATH="../chaincode"
CC_VERSION="1.0"
CC_SEQUENCE="1"

echo "=== Packaging and Deploying '${CC_NAME}' chaincode to channel '${CHANNEL_NAME}' ==="

if [ -d "../fabric-samples/test-network" ]; then
  cd ../fabric-samples/test-network
  ./network.sh deployCC \
    -ccn "${CC_NAME}" \
    -ccp "${CC_SRC_PATH}" \
    -ccl javascript \
    -c "${CHANNEL_NAME}" \
    -ccv "${CC_VERSION}" \
    -ccs "${CC_SEQUENCE}"
  echo "Chaincode '${CC_NAME}' successfully committed to '${CHANNEL_NAME}'"
else
  echo "Please run this script with Fabric test-network in ../fabric-samples/test-network."
fi
