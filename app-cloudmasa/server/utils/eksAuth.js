// server/utils/eksAuth.js
const AWS = require('aws-sdk');

const getEksAuthToken = async (clusterName, region, accessKeyId, secretAccessKey) => {
  const eks = new AWS.EKS({
    accessKeyId,
    secretAccessKey,
    region
  });

  try {
    const token = await eks.getClusterAuthToken({ name: clusterName }).promise();
    return token.status.token;
  } catch (err) {
    throw new Error(`Failed to get EKS auth token for ${clusterName}: ${err.message}`);
  }
};

module.exports = { getEksAuthToken };
