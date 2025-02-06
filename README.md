# WhatsApp-to-Google-Sheet-Intergration


## Overview
This project enables seamless integration between WhatsApp messages and Google Sheets. It automates the process of storing incoming WhatsApp messages into a Google Sheet using APIs and webhooks.

## Features
- Automatically logs WhatsApp messages in Google Sheets.
- Uses webhooks for real-time updates.
- Easy to deploy and configure.
- Supports multiple message formats.

## Requirements
- A Twilio or WhatsApp Business API account.
- Google Cloud account with Google Sheets API enabled.
- Python 3.x installed.
- Flask or FastAPI for handling webhooks.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/sumits234/WhatsApp-to-Google-Sheet-Intergration.git
   cd WhatsApp-to-Google-Sheet-Intergration
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up Google Sheets API and obtain credentials.
4. Configure Twilio/WhatsApp API for webhook integration.

## Usage
1. Run the script to start the server:
   ```bash
   python app.py
   ```
2. Set up your webhook URL in Twilio or WhatsApp API settings.
3. Check Google Sheets for logged messages.




