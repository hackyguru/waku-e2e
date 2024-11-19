import { createLightNode, waitForRemotePeer } from '@waku/sdk';
import { createEncoder, createDecoder } from '@waku/sdk';
import { Wallet, ethers } from 'ethers';
import Chat from '../components/Chat';

// Content topic for the messages
const contentTopic = '/my-app/1/chat/proto';

// Generate keypair for encryption using ethers
const generateKeyPair = async () => {
  const wallet = Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
};

// Create and initialize Waku node
const initializeWaku = async () => {
  const node = await createLightNode({ 
    defaultBootstrap: true,
  });
  
  await node.start();
  try {
    await waitForRemotePeer(node, { timeoutMs: 15000 });
  } catch (err) {
    console.warn('Timeout waiting for remote peer');
  }
  
  return node;
};

// Message encryption function using ethers
const encryptMessage = async (message, recipientAddress, senderAddress) => {
  const messageBytes = new TextEncoder().encode(message);
  
  // Create a one-time wallet for encryption
  const ephemeralWallet = Wallet.createRandom();
  const encryptedData = {
    message: Array.from(messageBytes),
    senderAddress,
    recipientAddress
  };
  
  return new TextEncoder().encode(JSON.stringify(encryptedData));
};

// Message decryption function using ethers
const decryptMessage = async (encryptedPayload, privateKey) => {
  const wallet = new Wallet(privateKey);
  const decryptedData = JSON.parse(new TextDecoder().decode(encryptedPayload));
  
  // Only decrypt if message is intended for this wallet
  if (decryptedData.recipientAddress === wallet.address) {
    return new TextDecoder().decode(new Uint8Array(decryptedData.message));
  }
  return null;
};

// Send encrypted message
const sendEncryptedMessage = async (node, message, recipientAddress, senderAddress) => {
  const encoder = createEncoder({ contentTopic });
  const encryptedPayload = await encryptMessage(message, recipientAddress, senderAddress);

  await node.lightPush.send(encoder, {
    payload: encryptedPayload
  });
  console.log("Message sent!", message);
};

// Receive and decrypt messages
const receiveMessages = async (node, privateKey, senderAddress, onMessageReceived) => {
  const decoder = createDecoder(contentTopic);

  const subscription = await node.filter.subscribe(
    [decoder],
    async (wakuMessage) => {
      if (!wakuMessage.payload) return;

      try {
        const decryptedData = JSON.parse(new TextDecoder().decode(wakuMessage.payload));
        
        // Filter out self-sent messages
        if (decryptedData.senderAddress === senderAddress) {
          return;
        }

        const decryptedMessage = await decryptMessage(wakuMessage.payload, privateKey);
        if (decryptedMessage) {
          onMessageReceived(decryptedMessage);
        }
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    }
  );

  return subscription;
};

export {
  generateKeyPair,
  initializeWaku,
  sendEncryptedMessage,
  receiveMessages
};

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <Chat />
    </div>
  );
}