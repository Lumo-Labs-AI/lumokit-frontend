<h1 align="center">LumoKit Frontend (v1.0.0)</h1>

<p align="center">
  <img src="https://i.ibb.co/8LJmPRQz/lumo-u.png" alt="LumoKit Logo" width="200"/>
</p>

---

## 🚀 What is LumoKit?

LumoKit is a lightweight AI Toolkit Framework offering a multitude of on-chain actions and researching abilities. Created by **Lumo Labs**, it is specifically tailored for the **Solana** ecosystem.

You are currently in the frontend repository of LumoKit.

---

## 🛠️ Tech Stack (Frontend)

*   **Framework:** Next.js (Built with React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Fonts:** Space Grotesk, Bebas Neue (as seen in [`app/layout.tsx`](app/layout.tsx))
*   **Wallet Integration:** Solana Wallet Adapter (inferred from [`components/WalletContextProvider.tsx`](components/WalletContextProvider.tsx))

---

## 🔗 Connect with Lumo Labs

Stay updated and join our community:

*   🐦 **X (Twitter):** [https://x.com/lumolabsdotai](https://x.com/lumolabsdotai)
*   ✈️ **Telegram:** [https://t.me/lumolabsdotai](https://t.me/lumolabsdotai)
*   🐙 **GitHub:** [https://github.com/Lumo-Labs-AI](https://github.com/Lumo-Labs-AI)
*   🤗 **HuggingFace:** [https://huggingface.co/lumolabs-ai](https://huggingface.co/lumolabs-ai)
*   📈 **DexScreener ($LUMO):** [https://dexscreener.com/solana/4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump](https://dexscreener.com/solana/4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump)

---

## ⚙️ Getting Started

Follow these steps to set up and run the LumoKit frontend locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Lumo-Labs-AI/lumokit-frontend.git
    cd lumokit-frontend
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```

3.  **Set up Environment Variables:**
    Rename the [`.env.example`](.env.example) file (located in the root of the project) to `.env.local`. Then, update the variables with your specific configuration.

    Create a `.env.local` file in the root directory with the following content, adjusting values as necessary:
    ````
    // filepath: .env.local
    # Backend API URL
    NEXT_PUBLIC_API_URL="http://localhost" # Or your backend's actual URL

    # Lumo Token Contract Address
    NEXT_PUBLIC_LUMO_TOKEN_ADDRESS="4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump"

    # Pro Subscription Amount ($LUMO)
    NEXT_PUBLIC_PRO_SUBSCRIPTION_AMOUNT="22000"

    # Payment Receiver Address
    NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS="CsTmcGZ5UMRzM2DmWLjayc2sTK2zumwfS4E8yyCFtK51" # Ensure this is an address you control

    # RPC URL for Solana - Recommended to use a dedicated provider like Helius, QuickNode, Alchemy, etc.
    NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
    ````

    **Environment Variable Details:**

    | Variable                            | Description                                                                                                | From [`.env.example`](.env.example)                     |
    | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
    | `NEXT_PUBLIC_API_URL`               | The URL of your LumoKit backend instance.                                                                  | `http://localhost`                             |
    | `NEXT_PUBLIC_LUMO_TOKEN_ADDRESS`    | The contract address of the $LUMO token on Solana.                                                         | `4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump`  |
    | `NEXT_PUBLIC_PRO_SUBSCRIPTION_AMOUNT` | The amount of $LUMO tokens required for a pro subscription.                                                | `22000`                                        |
    | `NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS`| The Solana wallet address that will receive subscription payments.                                         | `CsTmcGZ5UMRzM2DmWLjayc2sTK2zumwfS4E8yyCFtK51`  |
    | `NEXT_PUBLIC_SOLANA_RPC_URL`        | The RPC URL for connecting to the Solana blockchain. Using a dedicated RPC provider is highly recommended (Example: Helius). | `https://api.mainnet-beta.solana.com`          |

    *Note: The values from [`.env.example`](.env.example) are provided as defaults. Ensure `NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS` is an address you control if you intend to receive payments, and update `NEXT_PUBLIC_API_URL` to point to your running backend.*

4.  **Backend Dependency:**
    ⚠️ **Crucial Requirement:** The LumoKit frontend relies on a **running LumoKit backend instance**.
    *   Ensure your backend service is operational.
    *   Verify that the backend is accessible at the `NEXT_PUBLIC_API_URL` configured in your `.env.local` file.
    *   Refer to the LumoKit backend repository for its setup instructions.

5.  **Run the development server:**
    Using npm:
    ```bash
    npm run dev
    ```
    Or using yarn:
    ```bash
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or the port specified in your terminal, usually 3000 for Next.js) with your browser to see LumoKit in action.

---

## 🛠️ Tools Management

LumoKit's powerful features come from its extensible tools system. All tools are defined in [`data/tools.json`](data/tools.json) and can be managed through the UI.

### 📋 Tool Structure

Each tool in LumoKit is defined with the following properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `icon_url` | String | Path to the tool's icon (relative to public directory) | `/lumo-icon.png` |
| `default_status` | Boolean | Whether the tool is enabled by default | `true` |
| `tool_identifier` | String | Unique identifier for the tool | `wallet_portfolio_tool` |
| `name` | String | Display name for the tool | `Wallet Portfolio` |
| `category` | String | Category for grouping related tools | `Common` |
| `description` | String | Short explanation of the tool's functionality | `Get detailed information about all tokens held in a wallet` |
| `read_more` | String | URL to documentation for the tool | `https://lumolabs.ai` |

### ✨ Adding New Tools

When adding a new tool to LumoKit:

1. Add a new entry to the [`data/tools.json`](data/tools.json) file
2. Place the tool's icon in the `/public` directory
3. Ensure your backend implements the corresponding functionality
4. Test the tool thoroughly before setting `default_status` to `true`

### 🔄 How Tools are Used

Tools are loaded dynamically in the chat interface:

1. Default tools are loaded automatically for new users based on `default_status`
2. Users can customize their tool selection via the Tools & Settings modal
3. Selected tools are saved in localStorage as `lumokit_tools`
4. The [`ToolsAndSettingsModal.tsx`](components/chat/ToolsAndSettingsModal.tsx) component manages tool selection

### ⚠️ Important Considerations

- Keep tool descriptions concise but informative (recommended: 10-15 words)
- Use consistent naming conventions for `tool_identifier` (lowercase with underscores)
- Group related tools under the same category for better organization
- Limit default tools to maintain performance (2-3 maximum recommended)
- Ensure all tools have proper error handling in the backend

<p align="center">
  <em>Tools are the building blocks of LumoKit's functionality. Choose them wisely!</em>
</p>

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to LumoKit, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

---

## 📜 License

© 2025 Lumo Labs. LumoKit is open source and licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

---

<p align="center">
  <a href="https://dexscreener.com/solana/4FkNq8RcCYg4ZGDWh14scJ7ej3m5vMjYTcWoJVkupump">
    <img src="https://img.shields.io/badge/Token-$LUMO-brightgreen?style=for-the-badge" alt="$LUMO Token">
  </a>
</p>