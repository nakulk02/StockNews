# StockNews

A web application that displays stock information, news, and summaries using data fetched from various APIs. This project leverages **React**, **Node.js**, and **MongoDB** for full-stack functionality.

## 🚀 Features
- Display detailed stock information with real-time updates
- Visualize stock trends using **Candlestick Charts**
- Summarize financial news using the **Transformers**
- Efficient data fetching using **Axios**
- Organized code structure with reusable components

## 🛠️ Tech Stack
- **Frontend:** React.js, Material-UI (MUI), Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **APIs Used:** Finnhub API

## 📂 Project Structure
```
StockNews/
├── client/               # React frontend
│   ├── src/
│   │   ├── api/          # Axios instance for API calls
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main app pages (e.g., Stock.js)
│   │   ├── utils/        # Utility functions
│   │   └── App.js        # Entry point for React app
│
├── server/               # Node.js backend
│   ├── config/           # Environment variables and DB connection
│   ├── controllers/      # API endpoints logic
│   ├── models/           # Mongoose models
│   ├── routes/           # Express routes
│   └── server.js         # Entry point for Node.js server
│
└── .env                  # Environment variables
```

## ⚙️ Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/nakulk02/StockNews.git
   cd StockNews
   ```

2. Install dependencies for both client and server:
   ```bash
   npm install
   cd client && npm install
   ```

3. Create a `.env` file in the root and client folders:
**Root `.env` (for Node.js backend)**
```
PORT=5000
MONGO_URI=<your_mongodb_uri>
FINNHUB_API_KEY=<your_finnhub_api_key>
```

**Client `.env` (for React frontend)**
```
REACT_APP_API_BASE_URL=http://localhost:5000
```

4. Start the backend server:
   ```bash
   npm start
   ```

5. Start the React client:
   ```bash
   cd client
   npm start
   ```

## 📊 Usage
- Navigate to `http://localhost:3000` to view the frontend.
- Search for stock details, view the candlestick chart, and read summarized news articles.

## 🚨 API Endpoints
| Endpoint          | Method | Description                |
|-------------------|---------|----------------------------|
| `/api/stocks`      | `GET`   | Fetches stock data         |
| `/api/news`        | `GET`   | Fetches financial news     |
| `/api/summarize`   | `POST`  | Summarizes articles using Transformers |

## 🧩 Contributing
Contributions are welcome! To contribute:
- Fork the repository
- Create a new branch (`git checkout -b feature/your-feature`)
- Commit your changes (`git commit -m 'Add new feature'`)
- Push to the branch (`git push origin feature/your-feature`)
- Open a Pull Request

## 📄 License
This project is licensed under the **MIT License**.

## 🙌 Acknowledgements
- [Finnhub](https://finnhub.io/) for financial data
- [Transformers](https://huggingface.co/facebook/bart-large-cnn) for summarization
- [Material-UI](https://mui.com/) for UI components

---
Feel free to reach out for questions or collaboration ideas!
