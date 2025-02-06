//Importing required modules and packages

const fs = require('fs');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const {JWT} = require('google-auth-library');
const express = require('express');
const path = require('path');
const net = require('net');
const { google } = require('googleapis');
const readline = require('readline');
const { Readable } =  require('stream')
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { spawn } = require('child_process');

//QR code generation

const qrcode = require('qrcode-terminal');

const { Client, LocalAuth, MessageMedia, MessageTypes } = require('whatsapp-web.js');
const { stringify } = require('querystring');
const { chat } = require('googleapis/build/src/apis/chat');
const { isUndefined } = require('util');
const client = new Client({
    authStrategy: new LocalAuth({clientId: "client-one"})
});

function getExtensionFromMimetype(mimetype) {
    const typeMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'video/mp4' : 'mp4',
        'audio/mp3' : 'mp3',
        'audio/mpeg': 'mp3',
        'audio/ogg; codecs=opus' : 'ogg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'docx',
        'application/vnd.ms-excel' : 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'xlsx',
        'text/csv' : 'csv',
        'application/zip': 'zip',
        'text/plain' : 'txt',
        'image/webp' : 'jpg'

        // More mappings can be added here as needed
        //'media.mimetype' : 'fileExtension'
        //With above mappings, images with file extension 'jpg', 'jpeg', 'png'; documents including pdf, xls, xlsx, csv, txt, pptx; zip files; whatsapp voiceovers and normal mp3 audio and mp4 video are mapped.
    };

    return typeMap[mimetype] || null; //If mimetype is not matched from above mapping, null will be allotted to fileExtension.
}

function FileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKilobytes = fileSizeInBytes / 1024;
        const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

        console.log('File Size:');
        console.log(`Bytes: ${fileSizeInBytes}`);
        console.log(`Kilobytes: ${fileSizeInKilobytes}`);
        console.log(`Megabytes: ${fileSizeInMegabytes}`);

        return fileSizeInMegabytes;
    } catch (error) {
        console.error('Error getting file size:', error.message);
        return -1;
    }
}

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
    client.getChats();
});

client.initialize(); //Initialising QR code to scan and link Whatsapp account of Admin.

//Authenticating Google Drive

let chat_proposal;
let media_proposal;
let others_proposal;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

const credentials = 'client_drive.json';
const auth = new google.auth.GoogleAuth({
    keyFile: credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
      
async function createAndUploadFile(auth, file_name, file_mimetype, file_path){
    const driveService = google.drive({version: 'v3', auth })
    console.log('Hello')
    let fileMataData = {
        'name' : file_name,
        'parents' : ['1xlV******************************************'] // Drive Id
        }
    
    let media = {
        mimetype: file_mimetype,
        body: fs.createReadStream(file_path)
        }
    
    let response = await driveService.files.create({
        resource: fileMataData,
        media: media,
        fields: 'id'
        })
    
    switch(response.status){
        case 200:
            console.log('file Created id: ', response.data.id)
            break;
        default:
            console.log('Error Creating File: ', response.errors)
            break;
        }
    
    const driveLink = `https://drive.google.com/uc?id=${response.data.id}`;
    console.log('Google Drive link:', driveLink);
    return driveLink;
    }

async function callPythonScript(filePath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ["Final_Description_code_updated.py", filePath], { encoding: 'utf-8' });

        let scriptOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data;
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error from Python script: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                const lines = scriptOutput.split('\n');
                const objectIdentificationResultLine = lines.find(line => line.includes('Object Identification Result', 'PDF Content Description', 'Unsupported file type'));
                resolve(objectIdentificationResultLine);
            } else {
                reject(`Python script exited with code ${code}`);
            }
            //     resolve(scriptOutput);
            // } else {
            //     reject(`Python script exited with code ${code}`);
            // }
        });
    });
};
    

// Reference: Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
const clientJson = fs.readFileSync('client_secret.json', 'utf-8'); //Argument should contain path for the client_secret.json file and encoding
const clientData = JSON.parse(clientJson);
const serviceAccountAuth = new JWT({
    email: clientData.client_email,
    key: clientData.private_key,
    keyFile: clientJson,
    //Private key from JSON file should be used here
    scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
    ],
    //Here scope for google sheet and google drive is provided, scopes can be added if needed
});

const doc = new GoogleSpreadsheet('12RRfYEvgDFXq4AYPBEwuPXRCVgwEAQz_eM', serviceAccountAuth); //Sheet ID should be used as argument from link (https://docs.google.com/spreadsheets/d/1**************************dit#gid=0)

//Authenticating Google Sheet
function startMain(){
(async function () {
    await doc.loadInfo();  // loading document properties and worksheets
    console.log(doc.title);
    const sheet = doc.sheetsByIndex[0];
    await sheet.setHeaderRow(['Timestamp', 'From', 'From_Contact_No', 'To', 'Message', 'Link', 'File_Extension', 'File_Size', 'MsgType', 'OriginalMessage', 'MediaTranscript']);
    // {Timestamp : timestamp.toLocaleString(), From : message.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: message.body, Link: '', File_Extension: '', File_Size: '', MsgType: message.type, MsgCode: ''}
    const rows = await sheet.getRows();

    // Monitoring All Incoming Messages
    client.on('message', async message => {
        let myClient = {};


        //console.log(message);
        // console.log((message.from).replace(/\D/g, ''));

        // if (!selectedContacts.includes((message.from).replace(/\D/g, ''))) {
        //     console.log(`Skipping message from ${(message.from).replace(/\D/g, '')}`);
        //     return;
        // };
        let quotedMessage;
        
        const app = express();
        
        const timestamp = new Date(message.timestamp*1000);
        console.log(timestamp.toLocaleString());
        
        function extractLinks(input) {
            inputString = String(input)
            const regex = /(https?:\/\/[^\s]+)/g;
            const links = inputString.match(regex) || [];
            return links.join('\n');
          }
          
        // Monitoring Media Received(Images/Videos/Audios/Documents/Stickers)
        if(media_proposal){
        if(message.hasMedia) {
            if (message.hasQuotedMsg) {
                const originalMessage = await message.getQuotedMessage();
                if (originalMessage.type === 'chat'){
                    quotedMessage = originalMessage._data.body
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'location'){
                    quotedMessage = `Latitude: ${originalMessage.location.latitude}\nLongitude: ${originalMessage.location.longitude}`;
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.hasMedia){
                    const original_media = await originalMessage.downloadMedia();
                    const original_fileExtension = getExtensionFromMimetype(original_media.mimetype);
        
                    let original_fileName;
                    let original_fileMimetype;
                    let original_filePath;
                    //console.log(media)
                    if (original_fileExtension) {
                    original_fileName = `media_${originalMessage.id.id}.${original_fileExtension}`;
                    console.log(original_fileName);
                    const make_buffer = Buffer.from(original_media.data, 'base64');
                    fs.writeFileSync(original_fileName, make_buffer);
                    original_filePath = path.join(__dirname, original_fileName);
                    original_fileMimetype = original_media.mimetype;
                    original_fileSize = FileSize(original_filePath);
                    console.log(original_filePath);
                    console.log(typeof(original_fileName));
                    console.log(typeof(original_filePath));
                    console.log(typeof(original_media.mimetype));
                    //console.log(buffer)
                    console.log(`Media downloaded and saved to ${original_fileName}`);
                    }
                    const quotedMessage = await createAndUploadFile(auth, original_fileName, original_fileMimetype, original_filePath);
                    console.log(quotedMessage);
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'vcard'){
                    quotedMessage = 'contact'
                    console.log(quotedMessage)
                }
                else {
                    quotedMessage = 'replied to a previous message'
                    console.log(quotedMessage)
                }
    
            }
            const media = await message.downloadMedia();
            const fileExtension = getExtensionFromMimetype(media.mimetype);

            let fileName;
            let fileMimetype;
            let filePath;
            let fileSize;
            //console.log(media)
            if (fileExtension) {
            fileName = `media_${message.id.id}.${fileExtension}`;
            console.log(fileName);
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(fileName, buffer);
            filePath = path.join(__dirname, fileName);
            fileMimetype = media.mimetype;
            fileSize = FileSize(filePath);
            console.log(filePath);
            console.log(typeof(fileName));
            console.log(typeof(filePath));
            console.log(typeof(media.mimetype));
            //console.log(buffer)
            console.log(`Media downloaded and saved to ${fileName}`);
            }
            const driveLink = await createAndUploadFile(auth, fileName, fileMimetype, filePath);
            async function generateTranscript(){
            let transcript;
            await callPythonScript(filePath)
                .then((output) => {                    
                    if (!output){
                        transcript = 'File Type not supported for Description'
                        console.log('File Type not supported for Description')
                    }
                    else{
                    transcript = output;
                    console.log('Media Description:', output);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
            console.log('transcript:', transcript);
            client.getChats().then((chats) => {
                myClient = chats.find(
                (chat) => chat.id._serialized === message.from
            );
            // console.log(myClient)
            if (!myClient.name) {
                myClient.name = 'null';
            }

            if ((myClient.name).replace(/\D/g, '') === (message.from).replace(/\D/g, '')) {
                message_from = message._data.notifyName
            }
            else {
                message_from = myClient.name
            }

            if (myClient.isGroup){
                console.log(message.timestamp)
                console.log('Message on group')
                console.log(myClient.name);
                console.log((message.author).replace(/\D/g, ''));
                const isGroupMessageValue = String(myClient.isGroup);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        {Timestamp : timestamp.toLocaleString(), From : message._data.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: message.body, Link: driveLink, File_Extension: fileExtension, File_Size: fileSize, MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: transcript}
                    ]);
                })(); 
            }
            else{
                console.log('DM');
                console.log(myClient.name);
                console.log(message.from);
                console.log(myClient.id.user)
                const isGroupMessageValue = String(myClient.isGroup);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        // 'Timestamp', 'From', 'From Contact No.', 'To', 'Message', 'Link', 'File Extension', 'File Size', 'MsgType', 'MsgCode'
                        {Timestamp : timestamp.toLocaleString(), From : myClient.name, From_Contact_No : (message.from).replace(/\D/g, ''), To : 'Me', Message: message.body, Link: driveLink, File_Extension: fileExtension, File_Size: fileSize, MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: transcript}
                    ]);
                })();   
            }

            });
            
        } 
        generateTranscript();
            console.log(media.mimetype);
            console.log(fileExtension);
        };
    };
        
        //Tracking Location
        if (others_proposal){
        if (message.type === 'location'){
            const location = message.location;
            console.log('Location received:');
            console.log(`Latitude: ${location.latitude}`);
            console.log(`Longitude: ${location.longitude}`);
            let latitudeLongitude = `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`;
            const latitude = encodeURIComponent(location.latitude.toFixed(6));
            console.log(latitude)
            const longitude = encodeURIComponent(location.longitude.toFixed(6));
    
            const latitudeStr = encodeURIComponent(location.latitude.toFixed(6)) + encodeURIComponent(location.latitude >= 0 ? "N" : "S");
            console.log(latitudeStr)
            const longitudeStr = encodeURIComponent(location.longitude.toFixed(6)) + encodeURIComponent(location.longitude >= 0 ? "E" : "W");

            latitudeLongitude =`https://www.google.com/maps/place/${latitudeStr}+${longitudeStr}/@${latitude},${longitude},19.61z/data=!4m4!3m3!8m2!3d${latitude},${longitude}!4d${longitude}?entry=ttu`;
            console.log(latitudeLongitude);

            if (message.hasQuotedMsg) {
                const originalMessage = await message.getQuotedMessage();
                if (originalMessage.type === 'chat'){
                    quotedMessage = originalMessage._data.body
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'location'){
                    quotedMessage = `Latitude: ${originalMessage.location.latitude}\nLongitude: ${originalMessage.location.longitude}`;
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.hasMedia){
                    const original_media = await originalMessage.downloadMedia();
                    const original_fileExtension = getExtensionFromMimetype(original_media.mimetype);
        
                    let original_fileName;
                    let original_fileMimetype;
                    let original_filePath;
                    //console.log(media)
                    if (original_fileExtension) {
                    original_fileName = `media_${originalMessage.id.id}.${original_fileExtension}`;
                    console.log(original_fileName);
                    const make_buffer = Buffer.from(original_media.data, 'base64');
                    fs.writeFileSync(original_fileName, make_buffer);
                    original_filePath = path.join(__dirname, original_fileName);
                    original_fileMimetype = original_media.mimetype;
                    original_fileSize = FileSize(original_filePath);
                    console.log(original_filePath);
                    console.log(typeof(original_fileName));
                    console.log(typeof(original_filePath));
                    console.log(typeof(original_media.mimetype));
                    //console.log(buffer)
                    console.log(`Media downloaded and saved to ${original_fileName}`);
                    }
                    const quotedMessage = await createAndUploadFile(auth, original_fileName, original_fileMimetype, original_filePath);
                    console.log(quotedMessage);
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'vcard'){
                    quotedMessage = 'contact'
                    console.log(quotedMessage)
                }
                else {
                    quotedMessage = 'replied to a previous message'
                    console.log(quotedMessage)
                }
    
            }

            client.getChats().then((chats) => {
                myClient = chats.find(
                (chat) => chat.id._serialized === message.from
            );
            
            if (!myClient.name) {
                myClient.name = 'null';
            }

            if ((myClient.name).replace(/\D/g, '') === (message.from).replace(/\D/g, '')) {
                message_from = message._data.notifyName
            }
            else {
                message_from = myClient.name
            }
            
            if (myClient.isGroup){
                console.log('Message on group')
                console.log(myClient.name);
                console.log((message.author).replace(/\D/g, ''));
                const isGroupMessageValue = String(myClient.isGroup);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        {Timestamp : timestamp.toLocaleString(), From : message._data.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: latitudeLongitude, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                    ]);
                })(); 
            }
            else{
                console.log('DM');
                console.log(myClient.name);
                console.log(message.from);
                console.log(myClient.id.user)
                const isGroupMessageValue = String(myClient.isGroup);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        // 'Timestamp', 'From', 'From Contact No.', 'To', 'Message', 'Link', 'File Extension', 'File Size', 'MsgType', 'MsgCode'
                        {Timestamp : timestamp.toLocaleString(), From : myClient.name, From_Contact_No : (message.from).replace(/\D/g, ''), To : 'Me', Message: latitudeLongitude, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                    ]);
                })();   
            }
        
            // console.log('A location is received');


            // const isGroupMessageValue = String(myClient.isGroup);
            // (async function () {
            //     const moreRows = await sheet.addRows([
            //         {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: latitudeLongitude}
            //     ]);
            // })();
            });
        };
        };

            //Monitoring Chats
        if (chat_proposal){
            if (message.type === 'chat'){
                let quotedMessage = '';
                if (message.hasQuotedMsg) {
                    const originalMessage = await message.getQuotedMessage();
                    if (originalMessage.type === 'chat'){
                        quotedMessage = originalMessage._data.body
                        console.log(quotedMessage)
                        console.log('Reply to message ID:', originalMessage.id);
                        if (!quotedMessage){
                            quotedMessage = '';
                        }
                    }
                    else if (originalMessage.type === 'location'){
                        quotedMessage = `Latitude: ${originalMessage.location.latitude}\nLongitude: ${originalMessage.location.longitude}`;
                        console.log(quotedMessage)
                        console.log('Reply to message ID:', originalMessage.id);
                        if (!quotedMessage){
                            quotedMessage = '';
                        }
                    }
                    else if (originalMessage.hasMedia){
                        const original_media = await originalMessage.downloadMedia();
                        const original_fileExtension = getExtensionFromMimetype(original_media.mimetype);
            
                        let original_fileName;
                        let original_fileMimetype;
                        let original_filePath;
                        //console.log(media)
                        if (original_fileExtension) {
                        original_fileName = `media_${originalMessage.id.id}.${original_fileExtension}`;
                        console.log(original_fileName);
                        const make_buffer = Buffer.from(original_media.data, 'base64');
                        fs.writeFileSync(original_fileName, make_buffer);
                        original_filePath = path.join(__dirname, original_fileName);
                        original_fileMimetype = original_media.mimetype;
                        original_fileSize = FileSize(original_filePath);
                        console.log(original_filePath);
                        console.log(typeof(original_fileName));
                        console.log(typeof(original_filePath));
                        console.log(typeof(original_media.mimetype));
                        //console.log(buffer)
                        console.log(`Media downloaded and saved to ${original_fileName}`);
                        }
                        quotedMessage = await createAndUploadFile(auth, original_fileName, original_fileMimetype, original_filePath);
                        console.log(quotedMessage);
                        console.log('Reply to message ID:', originalMessage.id.id);
                        if (!quotedMessage){
                            quotedMessage = originalMessage.id.id;
                        }
                    }
                    else if (originalMessage.type === 'vcard'){
                        quotedMessage = 'contact'
                        console.log(quotedMessage)
                    }
                    else {
                        quotedMessage = 'replied to a previous message'
                        console.log(quotedMessage)
                    }
        
                }
                      
            client.getChats().then((chats) => {
                myClient = chats.find(
                (chat) => chat.id._serialized === message.from
            );
            console.log(myClient)
            // if (!myClient.name) {
            //     myClient.name = 'null';
            // }

            if (!myClient || (myClient.name).replace(/\D/g, '') === (message.from).replace(/\D/g, '')) {
                message_from = message._data.notifyName
            }
            else {
                message_from = myClient.name
            }

            //console.log(myClient.id._serialized);
            console.log(myClient.name);
            // console.log(myClient);
            if (myClient.isGroup){
                console.log('Message on group')
                console.log(myClient.name);
                console.log((message.author).replace(/\D/g, ''));
                const isGroupMessageValue = String(myClient.isGroup);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        {Timestamp : timestamp.toLocaleString(), From : message._data.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                    ]);
                })(); 
            }    
            else{
                console.log('DM');
                console.log(myClient.name);
                console.log(message.from);
                console.log(myClient.id.user)
                const extractedLinks = extractLinks(message.body);
                console.log(extractedLinks);
                const isGroupMessageValue = String(myClient.isGroup);
                console.log(quotedMessage);
                (async function () {
                    const moreRows = await sheet.addRows([
                        // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                        // 'Timestamp', 'From', 'From Contact No.', 'To', 'Message', 'Link', 'File Extension', 'File Size', 'MsgType', 'MsgCode'
                        {Timestamp : timestamp.toLocaleString(), From : message_from, From_Contact_No : (message.from).replace(/\D/g, ''), To : 'Me', Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                    ]);
                })();   
            }
            //  console.log(message);
                 
            });       
        };
    };
        
        //Monitoring received contacts
        if(others_proposal){
        if (message.type === 'vcard'){
            if (message.hasQuotedMsg) {
                const originalMessage = await message.getQuotedMessage();
                if (originalMessage.type === 'chat'){
                    quotedMessage = originalMessage._data.body
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'location'){
                    quotedMessage = `Latitude: ${originalMessage.location.latitude}\nLongitude: ${originalMessage.location.longitude}`;
                    console.log(quotedMessage)
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.hasMedia){
                    const original_media = await originalMessage.downloadMedia();
                    const original_fileExtension = getExtensionFromMimetype(original_media.mimetype);
        
                    let original_fileName;
                    let original_fileMimetype;
                    let original_filePath;
                    //console.log(media)
                    if (original_fileExtension) {
                    original_fileName = `media_${originalMessage.id.id}.${original_fileExtension}`;
                    console.log(original_fileName);
                    const make_buffer = Buffer.from(original_media.data, 'base64');
                    fs.writeFileSync(original_fileName, make_buffer);
                    original_filePath = path.join(__dirname, original_fileName);
                    original_fileMimetype = original_media.mimetype;
                    original_fileSize = FileSize(original_filePath);
                    console.log(original_filePath);
                    console.log(typeof(original_fileName));
                    console.log(typeof(original_filePath));
                    console.log(typeof(original_media.mimetype));
                    //console.log(buffer)
                    console.log(`Media downloaded and saved to ${original_fileName}`);
                    }
                    const quotedMessage = await createAndUploadFile(auth, original_fileName, original_fileMimetype, original_filePath);
                    console.log(quotedMessage);
                    console.log('Reply to message ID:', originalMessage.id);
                    if (!quotedMessage){
                        quotedMessage = '';
                    }
                }
                else if (originalMessage.type === 'vcard'){
                    quotedMessage = 'contact'
                    console.log(quotedMessage)
                }
                else {
                    quotedMessage = 'replied to a previous message'
                    console.log(quotedMessage)
                }
    
            }

            client.getChats().then((chats) => {
                myClient = chats.find(
                (chat) => chat.id._serialized === message.from
            );

            if (!myClient.name) {
                myClient.name = 'null';
            }
            
            if ((myClient.name).replace(/\D/g, '') === (message.from).replace(/\D/g, '')) {
                message_from = message._data.notifyName
            }
            else {
                message_from = myClient.name
            }

            console.log(message._data.vcardFormattedName);
            console.log((message._data.from).replace(/\D/g, ''));
            const phoneNumberRegex = /TEL;type=Mobile;waid=(\d+):\+\d+ (\d+) (\d+)/;
            const match = message.body.match(phoneNumberRegex);
            //console.log(match)
            
            if (match) {
                const phoneNumber = match[1];  // Phone Number
                const output = `${message._data.vcardFormattedName}\n+${phoneNumber}`;

                const isGroupMessageValue = String(myClient.isGroup);

                if (myClient.isGroup){
                    console.log('Message on group')
                    console.log(myClient.name);
                    console.log((message.author).replace(/\D/g, ''));
                    const isGroupMessageValue = String(myClient.isGroup);
                    (async function () {
                        const moreRows = await sheet.addRows([
                            // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                            {Timestamp : timestamp.toLocaleString(), From : message._data.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                        ]);
                    })(); 
                }
                else{
                    console.log('DM');
                    console.log(myClient.name);
                    console.log(message.from);
                    console.log(myClient.id.user)
                    const isGroupMessageValue = String(myClient.isGroup);
                    (async function () {
                        const moreRows = await sheet.addRows([
                            // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                            // 'Timestamp', 'From', 'From Contact No.', 'To', 'Message', 'Link', 'File Extension', 'File Size', 'MsgType', 'MsgCode'
                            {Timestamp : timestamp.toLocaleString(), From : message_from, From_Contact_No : (message.from).replace(/\D/g, ''), To : 'Me', Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                        ]);
                    })();   
                }
                // (async function () {
                //     const moreRows = await sheet.addRows([
                //     {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: output}
                //     ]);
                // })();   

                //console.log(formattedPhoneNumber);  // Output the formatted phone number

            } else {
                output = 'Phone number not found in vCard.';
                const isGroupMessageValue = String(myClient.isGroup);
                if (myClient.isGroup){
                    console.log('Message on group')
                    console.log(myClient.name);
                    console.log((message.author).replace(/\D/g, ''));
                    const isGroupMessageValue = String(myClient.isGroup);
                    (async function () {
                        const moreRows = await sheet.addRows([
                            // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                            {Timestamp : timestamp.toLocaleString(), From : message._data.notifyName, From_Contact_No : (message.author).replace(/\D/g, ''), To : myClient.name, Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                        ]);
                    })(); 
                }
                else{
                    console.log('DM');
                    console.log(myClient.name);
                    console.log(message.from);
                    console.log(myClient.id.user)
                    const isGroupMessageValue = String(myClient.isGroup);
                    (async function () {
                        const moreRows = await sheet.addRows([
                            // {timestamp: timestamp.toLocaleString(), isGroupMessage: isGroupMessageValue, messageFrom_groupName: myClient.name, mobileNumber_groupID: (message.from).replace(/\D/g, ''), messageType: message.type, messageBody: message.body}
                            // 'Timestamp', 'From', 'From Contact No.', 'To', 'Message', 'Link', 'File Extension', 'File Size', 'MsgType', 'MsgCode'
                            {Timestamp : timestamp.toLocaleString(), From : message_from, From_Contact_No : (message.from).replace(/\D/g, ''), To : 'Me', Message: message.body, Link: extractLinks(message.body), File_Extension: '', File_Size: '', MsgType: message.type, OriginalMessage: quotedMessage, MediaTranscript: ''}
                        ]);
                    })();   
                }
               
            };       
            }); 
        };
    };
    });    
})();
};

// setInterval(async () => {
//     console.log('Updating sheet every 1 min');
//     startMain();
//   }, 60 * 1000); // 12 hours in milliseconds

//   // Listen for the 'refresh' key event
//   rl.on('line', (input) => {
//     if (input.trim().toLowerCase() === 'refresh') {
//       console.log('Refreshing sheet...');
//       startMain();
//     }
//   });

// Prompt for updating chat on the google sheet
rl.question("Do you want to update chat on the google sheet?\nWrite 1 if 'Yes' otherwise 0 for 'No':", (answer) => {
if (answer === '1') {
    console.log('Sent Chats will be updated in the google sheet');
    chat_proposal = true;
} else if (answer === '0') {
    console.log('Sent chats will not be updated in the google sheet');
    chat_proposal = false;
} else {
    console.log('Wrong Input, Please type either 1 or 0.');
}

// Prompt for updating media on the google sheet
rl.question("Do you want to update media on the google sheet?\nWrite 1 if 'Yes' otherwise 0 for 'No':", (answer) => {
    if (answer === '1') {
    console.log('Sent media file drive links will be updated in the google sheet');
    media_proposal = true;
    } else if (answer === '0') {
    console.log('Sent media file drive links will not be updated in the google sheet');
    media_proposal = false;
    } else {
    console.log('Wrong Input, Please type either 1 or 0.');
    }

    // Prompt for updating other data on the google sheet
    rl.question("Do you want to update other data like sent location & contacts on the google sheet?\nWrite 1 if 'Yes' otherwise 0 for 'No':", (answer) => {
    if (answer === '1') {
        console.log('These will be updated in the google sheet');
        others_proposal = true;
    } else if (answer === '0') {
        console.log('These will not be updated in the google sheet');
        others_proposal = false;
    } else {
        console.log('Wrong Input, Please type either 1 or 0.');
    }

    // Close the readline interface
    rl.close();

    // Start the main code after getting all user input
    startMain();
    });
});
});

//   // Function to update the sheet
// async function updateSheet() {
//     // sheet update logic here...
//     await doc.loadInfo();
//     console.log(doc.title);
//     startMain();
// };
