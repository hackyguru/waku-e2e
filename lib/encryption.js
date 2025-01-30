import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

// Encrypt message
export const encryptMessage = async (message, senderPrivateKey, recipientAddress) => {
  try {
    const wallet = new ethers.Wallet(senderPrivateKey);
    
    // Create a simple encryption key from both addresses
    const encryptionKey = CryptoJS.SHA256(wallet.address + recipientAddress).toString();
    
    // Encrypt the message
    const encrypted = CryptoJS.AES.encrypt(message, encryptionKey).toString();
    
    console.log('Message encrypted successfully');
    return {
      encrypted,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    throw error;
  }
};

// Decrypt message
export const decryptMessage = async (encryptedData, privateKey, senderAddress, recipientAddress) => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    // Create the same encryption key
    const encryptionKey = CryptoJS.SHA256(senderAddress + recipientAddress).toString();
    
    // Decrypt the message
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      throw new Error('Decryption resulted in empty message');
    }
    
    console.log('Message decrypted successfully');
    return decryptedText;
  } catch (error) {
    console.error('Failed to decrypt message:', {
      error,
      senderAddress,
      recipientAddress,
      walletAddress: new ethers.Wallet(privateKey).address
    });
    throw error;
  }
}; 