# Telegram Ticket Alert Bot

A Telegram bot that alerts your group about the lowest airplane ticket prices based on your configured parameters.

## **Features**

- **Interactive Setup:** Use drop-down menus to set origin, destination, adult count, departure date (Jalali), and minimum amount.
- **Scheduled Alerts:** The bot checks for ticket prices every minute and alerts the group if a price meets the criteria.
- **Modular Structure:** Clean and maintainable codebase.
- **Logging:** Comprehensive logging with Tehran timezone.
- **Resilience:** Keeps the bot running using PM2 even if the application crashes or restarts.

## **Prerequisites**

- **Node.js:** Ensure you have Node.js (v14 or higher) installed. [Download Node.js](https://nodejs.org/)
- **Telegram Bot Token:** You already have a bot token. If not, create one using [BotFather](https://t.me/BotFather) on Telegram.
- **PM2:** For process management. Install globally using:
  
  ```bash
  npm install -g pm2