const { Client, Location, List, Buttons, LocalAuth} = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const socketIo = require('socket.io');
const http = require('http');
const client = new Client({
    restartOnAuthFail: true,
    // puppeteer: {
    //     headless: true,
    //     args: [
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox',
    //     '--disable-dev-shm-usage',
    //     '--disable-accelerated-2d-canvas',
    //     '--no-first-run',
    //     '--no-zygote',
    //     '--single-process', // <- this one doesn't works in Windows
    //     '--disable-gpu'
    //     ],
    // },
    // puppeteer: { headless: true }
});


const app = express();
const server =  http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', (req,res) => {
    res.sendFile('index.html', { root:__dirname});
});

client.initialize();



client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body === 'bia') {
        // Send a new message as a reply to the current one
        // msg.reply('biyol');

    } else if (msg.body === 'hafa') {
        // Send a new message to the same chat
        // client.sendMessage(msg.from, 'hafsut');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body === '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    } else if (msg.body === '!groupinfo') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body === '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    } else if (msg.body === '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
            *Connection info*
            User name: ${info.pushname}
            My number: ${info.wid.user}
            Platform: ${info.platform}
        `);
    } else if (msg.body === '!mediainfo' && msg.hasMedia) {
        const attachmentData = await msg.downloadMedia();
        msg.reply(`
            *Media info*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
    } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();

        quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);
    } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
        }
    } else if (msg.body === '!location') {
        msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    } else if (msg.location) {
        msg.reply(msg.location);
    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Status was updated to *${newStatus}*`);
    } else if (msg.body === '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hi @${contact.number}!`, {
            mentions: [contact]
        });
    } else if (msg.body === '!delete') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.fromMe) {
                quotedMsg.delete(true);
            } else {
                msg.reply('I can only delete my own messages');
            }
        }
    } else if (msg.body === '!pin') {
        const chat = await msg.getChat();
        await chat.pin();
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        await chat.archive();
    } else if (msg.body === '!mute') {
        const chat = await msg.getChat();
        // mute the chat for 20 seconds
        const unmuteDate = new Date();
        unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
        await chat.mute(unmuteDate);
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();
    } else if (msg.body === '!jumpto') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            client.interface.openChatWindowAt(quotedMsg.id._serialized);
        }
    } else if (msg.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);
    } else if (msg.body === '!reaction') {
        msg.react('👍');
    }
});

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    // notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    // notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_state', state => {
    console.log('CHANGE STATE', state );
});


io.on('connection', function(socket){
    socket.emit('message', 'Connecting.....');
    client.on('qr', (qr) => {
        // NOTE: This event will not be fired if a session is specified.
        console.log('QR RECEIVED', qr);
        // qrcode.generate(qr, { small: true });
        qrcode.toDataURL(qr, (err,url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, please scan the QR');
            console.log(err);
        });
    });

    client.on('loading_screen', (percent, message) => {
        console.log('LOADING SCREEN', percent, message);
    });
    
    
    client.on('authenticated', () => {
        socket.emit('message', 'Authenticated');
    });
    
    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
        socket.emit('message', 'AUTHENTICATION FAILURE');
    });
    
    client.on('ready', () => {
        socket.emit('qr', '');
        socket.emit('message', 'Whatsapp is Ready');
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', 'whastapp disconnected');
        socket.emit('qr', '');
    });
}) ;

//
const checkRegisteredNumber =  async function(number){
    const isRegistered =  client.isRegisteredUser(number);
    return isRegistered;
}


//send message

app.post('/send-message', (req, res) => {
    const number = req.body.number;
    const message = req.body.message;
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status:true,
            response:response
        });
    }).catch(err => {
        res.status(400).json({
            status:false,
            response:{
                err : err,
                number : number,
                message: message
            }
        })
    })
    ;

});

server.listen(7075, function() {
    console.log('app runing on :'+'7075');
});