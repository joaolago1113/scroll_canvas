# CollaborativeArtCanvas

**CollaborativeArtCanvas** is a decentralized platform that empowers users to collaboratively create vibrant pixel art on a 64x64 canvas. Participants can paint individual pixels or upload entire images, utilizing **PaintTokens**—an ERC20-based cryptocurrency—to purchase and set pixel colors. The system leverages smart contracts deployed on the **Scroll** mainnet to manage token transactions and ensure secure, ownership-based modifications of the canvas. This seamless integration of blockchain technology fosters a community-driven art experience, allowing anyone to contribute to and own a piece of the collective masterpiece.

You can access the Dapp right now at https://joaolago1113.github.io/scroll_canvas

---

## **Video Demo**

https://github.com/user-attachments/assets/4d566887-1631-4051-ac94-b61477a81dfa

---

## **Key Features**

- **64x64 Collaborative Canvas:** A fixed-size canvas where users can paint pixels individually or apply entire images.
- **PaintTokens (ERC20):** A cryptocurrency used to set pixel colors, ensuring secure and transparent transactions.
- **Smart Contract Integration:** Utilizes Solidity contracts deployed and verified on the Scroll mainnet to manage token supply, ownership, and pixel modifications securely.
- **Image Upload Capability:** Allows users to upload images, which can be applied to specific areas of the canvas by selecting designated regions.
- **User-Friendly Frontend:** An intuitive Next.js interface that facilitates easy interaction with the canvas, token purchases, and image uploads.

---

## **Technical Overview**

### **Smart Contracts**

- **Location:** `packages/hardhat/contracts/CollaborativeArtCanvas.sol` and `packages/hardhat/contracts/PaintToken.sol`
  
- **PaintToken.sol:**
  - **Description:** Manages the creation, distribution, and burning of PaintTokens, ensuring a controlled token economy within the platform.
  - **Deployment Address:** [0x78094a9d21b6e9a57e66c37885405b43a0784ddc](https://scrollscan.com/token/0x78094a9d21b6e9a57e66c37885405b43a0784ddc)
  - **Verified on Scroll:** Yes

- **CollaborativeArtCanvas.sol:**
  - **Description:** Handles the canvas state, pixel color updates, and interactions with PaintTokens, enabling users to paint and own pixels securely.
  - **Deployment Address:** [0x809fc41d9a8af8a74e965760d0daf264ff1910fc](https://scrollscan.com/address/0x809fc41d9a8af8a74e965760d0daf264ff1910fc)
  - **Verified on Scroll:** Yes

- **Verified Smart Contract on Scroll**: https://scrollscan.com/address/0x809fc41d9a8aF8a74e965760D0daf264FF1910Fc#code

### **Alchemy RPC via the Scroll API Integration**

- **Framework:** Scaffold-ETH 2
- **Configuration:**
  - **Alchemy RPC with Scroll API:** Integrated through **Scaffold-ETH 2** in `packages/nextjs/scaffold.config.ts`, enabling seamless interaction with the Scroll blockchain.
  - **Pointed Use of Alchemy RPC:** The Alchemy RPC is utilized in the frontend configuration through the `packages/nextjs/scaffold.config.ts` file, and `packages/hardhat/hardhat.config.ts`.

    - https://github.com/joaolago1113/scroll_canvas/blob/main/packages/hardhat/hardhat.config.ts

    - https://github.com/joaolago1113/scroll_canvas/blob/main/packages/nextjs/scaffold.config.ts

---

## **Deployment Details**

- **Blockchain Network:** Scroll Mainnet
- **Smart Contracts:**
  - **CollaborativeArtCanvas.sol**
    - **Address:** [0x809fc41d9a8af8a74e965760d0daf264ff1910fc](https://scrollscan.com/address/0x809fc41d9a8af8a74e965760d0daf264ff1910fc)
    - **Status:** Deployed and Verified
  - **PaintToken.sol**
    - **Address:** [0x78094a9d21b6e9a57e66c37885405b43a0784ddc](https://scrollscan.com/token/0x78094a9d21b6e9a57e66c37885405b43a0784ddc)
    - **Status:** Deployed and Verified

## **Getting Started**

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/CollaborativeArtCanvas.git
   cd CollaborativeArtCanvas
   ```

2. **Install Dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env.local` file in `packages/nextjs/` and add your Alchemy API Key and WalletConnect Project ID.
     ```
     NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
     NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id
     ```

4. **Compile Smart Contracts:**
   ```bash
   cd packages/hardhat
   npx hardhat compile
   ```

5. **Deploy Contracts (If Not Already Deployed):**
   ```bash
   npx hardhat run scripts/deploy.js --network scroll
   ```

6. **Run the Frontend:**
   ```bash
   cd ../nextjs
   yarn dev
   # or
   npm run dev
   ```

7. **Access the Application:**
   - Open [http://localhost:3000](http://localhost:3000) in your browser to start painting!

---

## **Contributing**

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

---

## **License**

This project is licensed under the MIT License.

---

## **Acknowledgements**

- [OpenZeppelin](https://openzeppelin.com/) for their robust smart contract libraries.
- [Scaffold-ETH](https://github.com/scaffold-eth/scaffold-eth-2) for providing a solid foundation for Ethereum development.
- [Alchemy](https://www.alchemy.com/) for their reliable RPC services.
- [Scroll](https://scroll.io/) for their scalable and efficient blockchain network.

