# WhatsApp-to-Google-Sheet-Intergration
Overview

This project enables seamless integration between WhatsApp messages and Google Sheets. It automates the process of storing incoming WhatsApp messages into a Google Sheet using APIs and webhooks.

Features

Automatically logs WhatsApp messages in Google Sheets.

Uses webhooks for real-time updates.

Easy to deploy and configure.

Supports multiple message formats.

Requirements

A Twilio or WhatsApp Business API account.

Google Cloud account with Google Sheets API enabled.

Python 3.x installed.

Flask or FastAPI for handling webhooks.

Installation

Clone the repository:

git clone https://github.com/sumits234/WhatsApp-to-Google-Sheet-Intergration.git
cd WhatsApp-to-Google-Sheet-Intergration

Install dependencies:

pip install -r requirements.txt

Set up Google Sheets API and obtain credentials.

Configure Twilio/WhatsApp API for webhook integration.

Usage

Run the script to start the server:

python app.py

Set up your webhook URL in Twilio or WhatsApp API settings.

Check Google Sheets for logged messages.
