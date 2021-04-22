//TODO: Fix the undefined (undefined) responses

require('dotenv').config();
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_BOT_ID = process.env.DISCORD_BOT_ID;
const DICTIONARY_API_KEY = process.env.DICTIONARY_API_KEY;

const RANDOM_WORD_EMOTE = '🅱';

const Eris = require("eris");
const fetch = require('node-fetch');

var bot = new Eris(DISCORD_BOT_TOKEN);

//random word package and related stuff
const randomWord = require('random-words');
var randWord = "";
var randWordLength = 0;
var partOfSpeech = "";
var def = "";
var blankWord = "";
var guessWord = [];
var guessedLetters = [];
var isLetter = new RegExp("[a-z]");//regex to check if letter
var players = [];
var scores = [];
var player_index = 0;
var inGame = false;

bot.on("ready", () => {
    console.log("Much wow. Shibe ready!");
});

bot.on("error", (err) => { console.log(err) });

bot.on("messageCreate", (msg) => {
    if (msg.author.id == DISCORD_BOT_ID) return;
    processMessage(msg);
});

bot.on("messageReactionAdd", (message, emoji, ... reactor) => {
    let user = !reactor.user ? reactor[0].user : reactor.user;
    if (user.id == DISCORD_BOT_ID) return;
    processReaction(message, emoji, user, message.channel.id);
});

function processMessage(msg)
{
    let cmd = msg.content.toLowerCase();
    let channelId = msg.channel.id;
    let username = msg.author.username;
    
    if(inGame) {
        guessString = "";
        for (i = 0; i < guessWord.length; i++) {
            guessString += guessWord[i];
        }
    }
    words = cmd.split(' ');
    
    switch(cmd) {
        //Misc
        case 'henlo':
        case 'hemlo':
        case 'hewwo':
        case 'hello':
        case 'hi':
        case 'howdy':
            bot.createMessage(channelId, `Bork ${cmd} <@${msg.author.id}>! OwO`);
            break;
        case "bork":
            let content = {
                tts: true,
                content: `bork bork`
            };
            bot.createMessage(channelId, content);
            break;
        //Game
        case "!game":
            if(inGame) {
                if (!joined(username)) joinGame(username, channelId);
            } else {
                bot.createMessage(channelId, `Add a ${RANDOM_WORD_EMOTE} to this message to play **Random word guessing game**`)
                .then((newMessage) => {
                    bot.addMessageReaction(channelId, newMessage.id, RANDOM_WORD_EMOTE);
                });
            }
            break;
        case "!score":
        case "!scores":
        case "score":
        case "scores":
            showScores(channelId);
            if(!inGame) {
                showNoGameMessage(channelId);
            }
            break;
        case "!help":
        case "help":
            if(inGame) {
                bot.createMessage(
                    channelId,
                    "**!join** -> *join the current game.*\n" +
                    "**!clue** or **!clues** -> *show current clues for the word to guess.*\n" +
                    "**!score** or **!scores** -> *show the scores.*\n" +
                    "**!turn** -> *check whose turn it is.*\n" +
                    "**letter** *<space>* a -> *guess a letter*\n" +
                    "**word** *<space>* aaaaa -> *guess whole word*\n"
                );
            } else {
                showNoGameMessage(channelId);
            }
            break;
        case "!quit":
            if (inGame) {
                if(!joined(username)) return;
                bot.createMessage(
                    channelId,
                    "**Quitters** don't win : P"
                );
                inGame = false;
                players = [];
                scores = [];
                guessedLetters = [];
                player_index = 0;
            } else {
                showNoGameMessage(channelId);
            }
            break;
        case "!join":
            if (inGame) {
                joinGame(username, channelId);
            } else {
                showNoGameMessage(channelId);
            }
            break;
        case "!clue":
        case "clue":
            if (inGame) {
                showClue(username, channelId, guessString);
            } else {
                showNoGameMessage(channelId);
            }
            break;
        case "!turn":
            if (inGame) {
                showTurn(username, channelId);
            } else {
                showNoGameMessage(channelId);
            }
            break;
        default:
            if(inGame) {
                if(words.length < 2) {
                    showInvalidInput(username, channelId);
                    return;
                }
                if(words[0] != 'word' && words[0] != 'letter') {
                    showInvalidInput(username, channelId);
                    return;
                }
                switch (words[0]) {
                    case 'word':
                        if(words[1].length > 0) {
                            guessTheWord(username, channelId, words[1]);
                        }
                        break;
                    case 'letter':
                        if(words[1].length == 1) {
                            guessALetter(username, channelId, words[1]);
                        }
                        break;
                }
            }
            break;
    }   
}

function processReaction(message, emoji, user, channelId)
{
    switch(emoji.name) {
        case RANDOM_WORD_EMOTE:
            if(!message.reactions[RANDOM_WORD_EMOTE].me) return;
            if(!joined(user.username)) joinGame(user.username, channelId);
            if(!inGame) randomWordGame(channelId);
            break;
    }
}

function showNoGameMessage(channelId)
{
    bot.createMessage(channelId, `There isn't any running game. Try using **!game** command to start a new one.`);
}

function randomWordGame(channelId)
{
    inGame = true;
    randWord = randomWord();
    randWordLength = randWord.length;
    blankWord = "";
    for (i = 0; i < randWordLength; i++) {
        if (i % 2 == 0) {
            blankWord += "▓";
        } else {
            blankWord += "░";
        }
    }
    guessWord = blankWord.split('');
    
    bot.sendChannelTyping(channelId);
    //Hehe... shibe bot go fetch
    fetch(`https://dictionaryapi.com/api/v3/references/collegiate/json/${randWord}?key=${DICTIONARY_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            let word = data;
            
            let wordIndex = getRandomInt(word.length);
            let defIndex = getRandomInt(word[wordIndex].shortdef.length);

            def = word[wordIndex].shortdef[defIndex];
            partOfSpeech = word[wordIndex].fl;

            bot.createMessage(
                channelId,
                blankWord + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" + "(" + partOfSpeech + ") " + def + "\n```"
            );
        })
        .catch(err => {
            console.log(err);
            randomWordGame(channelId);
        });
}

function guessTheWord(username, channelId, word)
{
    if (!joined(username)) {
        showJoinMessage(username, channelId);
        return;
    }
    
    if (players[player_index] != username) {
        showNotYourTurn(username, channelId);
        return;
    }
    
    if (word == randWord) {
        bot.createMessage(
            channelId,
            word + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" + "(" + partOfSpeech + ") " + def + "\n```"
        );
        showWinMessage(username, channelId);
        inGame = false;
        guessedLetters = [];
        return;
    } else {
        bot.createMessage(
            channelId,
            "Sorry, " + username + " but `" + word + "` isn't the right word! Try again :3"
        );
        nextPlayer();
        showTurnNow(players[player_index], channelId);
    }
}

function guessALetter(username, channelId, letter)
{
    if (!joined(username)) {
        showJoinMessage(username, channelId)
        return;
    }

    if (players[player_index] != username) {
        showNotYourTurn(username, channelId);
        return;
    }
    
    if (!isLetter.test(letter)) {
        bot.createMessage(
            channelId,
            `${username}, '${letter}' is not a letter :<`
        );
        return;
    }
    
    matchPos = [];
    
    for (i = 0; i < randWord.length; i++) {
        if (randWord.charAt(i) == letter) {
            matchPos.push(i);
        }
    }

    guessedLetters.push(letter);
    guessedLetters = [...new Set(guessedLetters)];
    guessedLetters.sort();
    
    if(matchPos.length <= 0) {
        bot.createMessage(
            channelId,
            `${username}, your guess didn't match any letter in the word. Better luck next try! owo`
        );
        
        nextPlayer();
        showTurnNow(players[player_index], channelId);
        return;
    }
    
    bot.createMessage(
        channelId,
        `${username} guessed letter '${letter}' and it matched!`
    );

    for (i = 0; i < matchPos.length; i++) {
        guessWord[matchPos[i]] = letter;
    }
    
    guessString = "";
    for (i = 0; i < guessWord.length; i++) {
        guessString += guessWord[i];
    }

    bot.createMessage(
        channelId,
        guessString + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" + "(" + partOfSpeech + ") " + def + "\n``` \n**Previous Letters: **" + guessedLetters
    );
    
    ///Check win condition
    letters = 0;
    for (i = 0; i < guessWord.length; i++) {
        if (isLetter.test(guessWord[i])) letters++;
    }
    //check if the whole word is completely guessed
    if (letters == guessWord.length) {
        showWinMessage(username, channelID);
        inGame = false;
        guessedLetters = [];
        return;
    } else if (guessWord.length - letters == 1) {
        bot.createMessage(
            channelId,
            "1 more letter to guess! Or maybe you can guess the word now? Owo"
        );
    }
    
    bot.createMessage(
        channelId,
        `It's still **${username}**'s turn. OwO`
    );
}

function showInvalidInput(username, channelId)
{
    bot.createMessage(channelId, `Invalid command. ${username}, please try using *word <word>* or *letter <letter* to start guessing.`);
}

function joined(user)
{
    return players.indexOf(user) >= 0;
}

function joinGame(user, channelId)
{
    if (players.indexOf(user) < 0) {
        players.push(user);
        scores.push(0);
        bot.createMessage(
            channelId, 
            `-----\n ${user}, has joined the game! owo\n**Current Players:** ${players}\n-----`
        );
    } else {
        bot.createMessage(
            channelId,
            `${user}, you are already in the game! xD\n**Current Players:** ${players}`
        );
    }
}

function showJoinMessage(user, channelId)
{
    bot.createMessage(
            channelId, 
            `${user}, you're not in the game yet. Use the command **!join** or add a ${RANDOM_WORD_EMOTE} to this message to join.`
        )
        .then((newMessage) => {
            bot.addMessageReaction(channelId, newMessage.id, RANDOM_WORD_EMOTE);
        });
}

function showWinMessage(user, channelId) {
    scores[player_index] += 1;
    bot.createMessage(
        channelId,
        `${user}, **wins**! OwO\nAdd a ${RANDOM_WORD_EMOTE} to this message to start a new game.`
    ).then((newMessage) => {
        bot.addMessageReaction(channelId, newMessage.id, RANDOM_WORD_EMOTE);
    });
}

function showNotYourTurn(user, channelId)
{
    bot.createMessage(
        channelId,
        `It's not your turn, ${user}! ÒwÓ\nIt's ** ${players[player_index]}**'s turn!`
    );
}

function showTurnNow(user, channelId)
{
    bot.createMessage(
        channelId,
        `It's **${user}**'s turn now! :3`
    );
}

function nextPlayer()
{
    if (player_index + 1 <= players.length - 1) {
        player_index++;
    } else {
        player_index = 0;
    }
}

function showScores(channelId) {
    if (players.length > 0) //show scores
    {
        scoresString = "";
        for (i = 0; i < players.length; i++) {
            scoresString += players[i] + ": " + scores[i] + "\n";
        }
        
        bot.createMessage(
            channelId,
            `**Scores:**\n ${scoresString}`
        );
    } else {
        bot.createMessage(
            channelId,
            `No scores to show. owo`
        );
    }
}

function showClue(username, channelId, guessString)
{
    if (joined(username)) {
        bot.createMessage(
            channelId,
            guessString + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" + "(" + partOfSpeech + ") " + def + "\n``` \n**Previous Letters: **" + guessedLetters
        );
    } else {
        showJoinMessage(username, channelId)
    }
}

function showTurn(username, channelId)
{
    if (joined(username)) {
        if (username != players[player_index]) {
            bot.createMessage(
                channelId,
                `It's **${players[player_index]}**'s turn.`
            );
        } else {
            bot.createMessage(
                channelId,
                `It's **your** turn, ${players[player_index]}.`
            );
        }
    } else {
        showJoinMessage(username, channelId)
    }
}

function getRandomInt(max)
{
    return Math.floor(Math.random() * max);
}

bot.connect(3000);