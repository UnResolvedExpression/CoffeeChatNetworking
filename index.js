const env = process.env.NODE_ENV || 'development';
const Discord = require('discord.js');
require('dotenv').config();
const client = new Discord.Client();
const cron = require('node-cron');
const { timeData } = require('./sheets');
const prefix = 'c!';
//Source Code: https://github.com/RobertG-H/coffee-bot-discord/blob/master/README.md
const githubRepo = 'https://github.com/UnResolvedExpression/CoffeeChatNetworking/blob/main/README.md';
const coffeeChatterRole = 'Coffee Chatter';
const matchChannel = 'weekly-coffee-chats'; 
const coffeeChattersPerMatch = 4; 

// LOGGING CONSTS
const missing_role_msg = `Server doesn't have a '${coffeeChatterRole}' role. Please create this role`;

// Shuffle Algo: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }  
    return array;
  }

// Class to represent group of coffee chatters
class CoffeeGroup {
    constructor(id, firstUser) {
        this.id = id;
        this.users = [];
        this.users.push(firstUser);
        this.dayArr=[];
        this.timeArr=[];
    }

    print_group(channel) {
        let outputMsg = `Coffee Chat Group ${this.id}: `;
        this.users.forEach(user => outputMsg += `${user}, `);
        outputMsg += '\n';
        outputMsg+="Suggested Day(s): "+this.dayArr;
        outputMsg += '\n';
        outputMsg+="Suggested Time(s): "+this.timeArr;
        outputMsg += '\n';
        outputMsg += "━━━━━━━━━━━━━━━━━━━━━━━━";
        channel.send(outputMsg);
    }
}

function stayAwake() {
    console.log('I am awake!')
}

function matchCoffeeChatters(guild) {
    // Get Channel to match
    const channel = guild.channels.cache.find(channel => channel.name === matchChannel)
    if (!channel) {
        console.log(`Error with guild: ${guild.id} could not find text channel: ${matchChannel}`);
        return;
    }
    // Get list of all members with the role
    let role = guild.roles.cache.find(r => r.name === coffeeChatterRole);
    if (!role) {
        channel.send(missing_role_msg);
    }
    let coffeeChatters = role.members.array();
    let coffeeGroups = [];
    let groupIdCounter = 1;
    shuffle(coffeeChatters);

    //this retrieves the sheets data for time matching
    const sourceFile = require('./sheets');
    var nameCol = sourceFile.timeData.map(function(value,index) { return value[0]; });

    //all possible days and times
    var dayArr= ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    var timeArr=["9am to 12pm EST", "12pm to 3pm EST", "3pm to 6pm EST", "6pm to 9pm EST", "9pm to 12am EST", "12am to 3am EST"];

    // Create Coffee Groups
    for (let i = 0; i < coffeeChatters.length; i+=coffeeChattersPerMatch) {
        // Create Coffee Groups of size coffeeChattersPerMatch
        let group = new CoffeeGroup(groupIdCounter, coffeeChatters[i]);
        groupIdCounter++;

        //union sets for groups
        var dayArrU = dayArr;
        var timeArrU = timeArr;
        for (let j = i+1; j < i+coffeeChattersPerMatch; j++) {
            if(coffeeChatters[j]){
                group.users.push(coffeeChatters[j]);
                var idx = nameCol.indexOf(coffeeChatters[j].user.tag)
                //if this user has an entry in the sheets
                if(idx!==-1){
                dayArrU = dayArrU.filter(x => sourceFile.timeData[idx][1].split(", ").includes(x));
                timeArrU = timeArrU.filter(x => sourceFile.timeData[idx][2].split(", ").includes(x));
                }                
            }
        }
        group.dayArr=dayArrU;//this sends the days and times to get sent with ping
        group.timeArr=timeArrU;
        // If the last group is only 1 person then add them to the last group
        
        if(group.users.length == 1) {
            coffeeGroups[coffeeGroups.length-1].users.push(coffeeChatters[i]);
        } else {
            coffeeGroups.push(group);
        }        
    }

    // Post Coffee Groups
    let outputMsg = "These are the coffee chat matches for the week! I hope you can find some time to chat ☕"
    channel.send(outputMsg);
    coffeeGroups.forEach((group) => {
        group.print_group(channel);
    })
}

/**Matches all users with the role */
function startMatch() {
    //const sourceFile = require('./sheets');
    console.log(sourceFile.variableName);
    client.guilds.cache.forEach((guild) => {
        matchCoffeeChatters(guild);
    });
}

// Setup
client.once('ready', () => {
    console.log('Coffee Bot Loaded!');
    client.user.setActivity('Java Jumper');
});

// When joining a server
client.on("guildCreate", guild => {
    guild.systemChannel.send('Hello I am Coffee Bot!');
    console.log(`Just joined: ${guild.name}`);
});

// Text commands
client.on('message', message => {
    if (message.author.bot) return;
    if (message.channel.type === "dm") return message.channel.send("No feature here yet sorry...");
    if (!message.content.startsWith(prefix)) return;

    let cmd = message.content.split(prefix)[1].toLowerCase();

    /* SECTION: COMMANDS */
    // HELP
    if (cmd === 'help') {
        message.channel.send(`Hiya! \n\nMy name is Coffee Bot. \n\nYou can see my other commands at: ${githubRepo} `);
    }
    // HELLO
    else if (cmd === 'hello') {
        message.channel.send("Hiya!");
    }
    // BOTINFO
    else if (cmd === 'botinfo' || cmd === 'info') {
        let bicon = client.user.displayAvatarURL();
        let botembed = new Discord.MessageEmbed()
            .setDescription("All about me!")
            .setColor("#db404a")
            .setThumbnail(bicon)
            .addField("List of commands", githubRepo)
        return message.channel.send(botembed);
    }
    // ROLE ADD
    else if (cmd === 'signup' || cmd === 'sign up' || cmd === 'sign-up') {
        let role = message.guild.roles.cache.find(r => r.name === coffeeChatterRole);
        if (!role) {
            return message.channel.send(missing_role_msg);
        }     
        let member = message.member;
        if (member.roles.cache.find(r => r.name === coffeeChatterRole)) {
            return message.channel.send(`${message.member} you already have the ${coffeeChatterRole} role.`);
        }
        member.roles.add(role);
        return message.channel.send(`${message.member} you are now a ${coffeeChatterRole}!`);
    }
    // ROLE ADD
    else if (cmd === 'leave') {
        let role = message.guild.roles.cache.find(r => r.name === coffeeChatterRole);
        if (!role) {
            return message.channel.send(missing_role_msg);
        }     
        let member = message.member;
        if (!member.roles.cache.find(r => r.name === coffeeChatterRole)) {
            return message.channel.send(`${message.member} you aren't a ${coffeeChatterRole}, so there is no role to remove.`);
        }
        member.roles.remove(role);
        return message.channel.send(`${message.member} you are no longer a ${coffeeChatterRole}.`);
    }

    /** SECTION ADMIN COMMANDS ONLY */
    else if (cmd === 'config forcematch') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            console.log(`${message.member} you doesn't have the permissions for this command.`);
            return;
        }
        startMatch();
    }
});

client.login(process.env.DISCORD_TOKEN);

// Scheduler to post matches
// Every Monday at 10 AM
var task = cron.schedule('0 10 * * Monday', function () {
    startMatch();
}, {
    scheduled: true,
    timezone: "America/New_York"
  });
task.start();
