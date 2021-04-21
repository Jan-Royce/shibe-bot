/*
	Shibe Bot
	Soon: 
	*Add word categories
	*randomize from number of available word meanings:
	   *for(i=0;i<word.length;i++)
		{
			console.log(word[i].shortdef)
		}
*/

require('dotenv').config()
var Discord = require('discord.io');
var logger = require('winston');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DICTIONARY_API_KEY = process.env.DICTIONARY_API_KEY;

//Make jQuery work w/o actual doc body
const html = `
<!DOCTYPE html>
<html>
<head>
</head>
<body>
</body>
</html>
`;

const { JSDOM } = require('jsdom');
const jsdom = new JSDOM(html);

//windom and doc from jsdom
const {window} = jsdom;
const {document} = window;
//global vars for window and document
global.window = window;
global.document = document;

//jquery
const $ = global.jQuery = require('jquery');

//random pupper
const randomPuppy = require('random-puppy');

//random word package and related stuff
const randomWord = require('random-words');
var randWord = "";
var randWordLength = 0;
var partOfSpeech = "";
var blankWord = "";
var guessWord = [];
var guessedLetters = [];
var isLetter = new RegExp("[a-z]");//regex to check if letter
var players = [];
var scores = [];
var player_index = 0;

//game variables
var game = "";
var inGame = false;

//Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console,
{
	colorize: true
});

logger.level = 'debug';
//Initialize Discord Bot
var bot = new Discord.Client(
{
	token: DISCORD_BOT_TOKEN,
	autorun: true
});

bot.on('ready', function(evt)
{
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + '-('+bot.id+')');
});

bot.on('any', function (event) {
	if (event.t == 'MESSAGE_REACTION_ADD') {
		console.log(event)
	}
});

bot.on('message', function(user, userID, channelID, message, evt)
{
	if(inGame == false) //check if in-game
	{
		///NOT IN-GAME

		//bot responses
		var cmd = message;

		//change to lower case
		cmd = cmd.toLowerCase();
		//logger.info('cmd: ' + cmd);
		switch(cmd)
		{
			case 'henlo': 
			case 'hemlo':
			case 'hewwo':
			case 'hello':
			case 'hi':
			case 'howdy':
				bot.sendMessage(
				{
					to: channelID,
					message: 'Bork! ' + cmd + ' ' + user + '! OwO',
					typing: true
				});
			break;

			case "who's a good boi?":
				bot.sendMessage(
				{
					to: channelID,
					message: 'O///w///O'
				});
			break;

			case "!game":
				bot.sendMessage(
				{
					to: channelID,
					message: '**!game randomword** -> *Random word guessing game.*'
				});
			break

			case "!game randomword":
				if(!joined(user)) joinGame(user, channelID);
				randomWordGame(channelID);
			break;

			case "!score":
			case "!scores":
				showScores(channelID);
			break;

			case "!randoggo":
				$.getJSON('https://dog.ceo/api/breeds/image/random',function(data)
		    	{
		    		bot.sendMessage(
					{
						to: channelID,
						message: data.message
					});
		    	});
			break;

			case "!pupper":
				randomPuppy().then(url=>
				{
					bot.sendMessage(
					{
						to: channelID,
						message: url
					});
				});
			break;

			case "bye":
				bot.sendMessage(
				{
					to: channelID,
					message: "Pleash don't go T^T",
					typing: true
				});
			break;
			//other commands goes here
		}
	}
	else //in-game
	{
		var cmd = message;//message from user
		cmd = cmd.toLowerCase();
		words = cmd.split(' ');//split to words

		// logger.info("In-Game!!!");

		switch (game)
		{
			case "randomword"://game is random word

				//get string for clue
				guessString = "";
				for(i=0; i<guessWord.length; i++)
				{
					guessString += guessWord[i];
				}

				//commands, etc
				if(cmd == "!help" || cmd == "help")
				{
					bot.sendMessage(
					{
						to: channelID,
						message: "**!join** -> *join the current game.*\n" +
						"**!clue** or **!clues** -> *show current clues for the word to guess.*\n" +
						"**!score** or **!scores** -> *show the scores.*\n" +
						"**!turn** -> *check whose turn it is.*\n" +
						"**letter** *<space>* a -> *guess a letter*\n" +
						"**word** *<space>* aaaaa -> *guess whole word*\n"
					});
				}
				if(cmd == "!quit")//end game
				{
					bot.sendMessage(
					{
						to: channelID,
						message: "**Quitters** don't win : P"
					});	
					inGame = false;
					game = "";
					//clear list
					players = [];
					scores = [];
					guessedLetters = [];
					player_index = 0;
				}
				if(cmd == "!join")//player joins
				{
					joinGame(user, channelID);
				}
				if(cmd == "!clue" || cmd == "!clues")//command is 'clue'
				{
					if(joined(user))//check if player is in game before following command
					{
						bot.sendMessage(
						{
							to: channelID,
							message: guessString + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" +  "(" + partOfSpeech + ") " +  def + "\n``` \n**Previous Letters: **" + guessedLetters
						});	
					}
					else //ask player to join
					{
						bot.sendMessage(
						{
							to: channelID,
							message: user + ", you're not in the game yet. Use the command **!join** to join the game."
						});
					}
				}
				if(cmd == "!turn")
				{
					if(joined(user))//check if player is in game before following command
					{
						//show whose turn
						if(user != players[player_index])//not player's turn
						{
							bot.sendMessage(
							{
								to: channelID,
								message: "It's **" + players[player_index] + "**'s turn."
							});
						}
						else //player's turn
						{
							bot.sendMessage(
							{
								to: channelID,
								message: "It's **your** turn, " + user + "."
							});
						}
					}
					else //ask player to join
					{
						bot.sendMessage(
						{
							to: channelID,
							message: user + ", you're not in the game yet. Use the command **!join** to join the game."
						});
					}
				}
				if(cmd == "!score" || cmd == "!scores")
				{
					showScores(channelID);
				}
				else if(words.length>=2 && words[0]=="word" && words[1].length>0) //player entered word (word <word>)
				{
					if(joined(user))//check if player is in game before following command
					{
						if(players[player_index] == user)//check if it's user's turn when the message was sent
						{
							//check if the word is the right one
							if(words[1] == randWord)//if it matches
							{
								//display word + win message
								bot.sendMessage(
								{
									to: channelID,
									message: words[1] + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n"  + "(" + partOfSpeech + ") " +  def + "\n```"
								});
								winMessage(user, channelID);
								inGame = false; //stop game
								game = "";
								guessedLetters = [];
							}
							else
							{
								bot.sendMessage(
								{
									to: channelID,
									message: "Sorry, " + user + " but `" + words[1] + "` isn't the right word! Try again :3"
								});
								//next player
								nextPlayer();
								turnNow(players[player_index], channelID);
							}
						}
						else
						{
							notYourTurn(user, channelID);
						}
					}
					else //ask player to join
					{
						bot.sendMessage(
						{
							to: channelID,
							message: user + ", you're not in the game yet. Use the command **!join** to join the game."
						});
					}
				}
				else if(words.length>=2 && words[0]=="letter" && words[1].length==1)//player entered letter guess (letter <letter>)
				{
					if(joined(user))//check if player is in game before following command
					{
						if(players[player_index] == user)//check if it's user's turn when the message was sent
						{
							if(isLetter.test(words[1]))//letter guessed is in a-z
							{
								matchPos = [];
								//check if letter is in word - randWord
								//and get match positions
								for(i=0; i<randWord.length; i++)
								{
									if(randWord.charAt(i) == words[1])
									{
										matchPos.push(i);
									}
								}

								guessedLetters.push(words[1]); //get letter
								guessedLetters = [...new Set(guessedLetters)]; //get distinct values
								guessedLetters.sort();

								//check if there are matches
								if(matchPos.length > 0) //match
								{
									//message
									bot.sendMessage(
									{
										to: channelID,
										message: user + " guessed letter '" + words[1] + "' and it matched!"
									});
									//fill in the blanks
									for(i=0; i<matchPos.length; i++)
									{
										guessWord[matchPos[i]] = words[1];
									}
									//display change
									guessString = "";
									for(i=0; i<guessWord.length; i++)
									{
										guessString += guessWord[i];
									}

									bot.sendMessage(
									{
										to: channelID,
										message: guessString + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" +  "(" + partOfSpeech + ") " +  def + "\n``` \n**Previous Letters: **" + guessedLetters
									});
									///Check win condition
									letters = 0;
									for(i=0; i<guessWord.length; i++)
									{
										//check if element is a letter
										if(isLetter.test(guessWord[i])) letters++;
									}
									//check if the whole word is completely guessed
									if(letters == guessWord.length)
									{
										winMessage(user, channelID);
										inGame = false;//stop game
										game = "";
										guessedLetters = [];
									}
									else if(guessWord.length-letters == 1)
									{
										bot.sendMessage(
										{
											to: channelID,
											message: "1 more letter to guess! Or maybe you can guess the word now? Owo"
										});
									}
									//still player's turn
									bot.sendMessage(
									{
										to: channelID,
										message: "It's still **" + user + "**'s turn. OwO"
									});
								}
								else //no match
								{
									bot.sendMessage(
									{
										to: channelID,
										message: user + " your guess didn't match any letter in the word. Better luck next try! owo"
									});
									//next player
									nextPlayer();
									turnNow(players[player_index], channelID);
									//NOTE: add letter to array of guessed letter
								}
							}
							else //not a letter
							{
								bot.sendMessage(
								{
									to: channelID,
									message: user + ", " + words[1] + " is not a letter :<"
								});
							}
						}
						else
						{
							notYourTurn(user, channelID);
						}
					}
					else //ask player to join
					{
						bot.sendMessage(
						{
							to: channelID,
							message: user + ", you're not in the game yet. Use the command **!join** to join the game."
						});
					}
				}
			break;
			//other games
		}
	}
});

function randomWordGame(channelID)
{
	//get random word
	randWord = randomWord();
	randWordLength = randWord.length;
	blankWord = "";
	for(i=0; i<randWordLength; i++)
	{
		if(i%2==0)
		{
			blankWord += "▓";
		}
		else
		{
			blankWord += "░";
		}
	}
	//turn blankWord to array
	guessWord = blankWord.split('');

	//get the word's definition
	//*
	function getDef(callback)
	{
		$.getJSON(`https://dictionaryapi.com/api/v3/references/collegiate/json/${randWord}?key=${DICTIONARY_API_KEY}`, function(data)
		{
			callback(data);
		});
	}
	//*/

	//get stuff from returned JSON
	getDef(function(data)
	{
		word = data;
		//logger.info("def: " + word[0].shortdef[0]);
		
		//get definition & part of speech
		def = word[0].shortdef[0];
		partOfSpeech = word[0].fl;

		//display definition
		bot.sendMessage(
		{
			to: channelID,
			message: blankWord + " (" + randWordLength + " letters)\n**DEFINITION**: " + "```css\n" + "(" + partOfSpeech + ") " + def + "\n```",
			typing: true
		});

		inGame = true;
		game = "randomword";
	});
}

function joined(user)
{
	if(players.indexOf(user) < 0) return false;
	else return true;
}

function joinGame(user, channelID)
{
	if(players.indexOf(user) < 0)
	{
		players.push(user); //add player
		scores.push(0);//add score for player
		bot.sendMessage(
		{
			to: channelID,
			message: "-----\n" + user + ", has joined the game! owo\n**Current Players:** " + players + "\n-----"
		});
	}
	else
	{
		bot.sendMessage(
		{
			to: channelID,
			message: user + ", you are already in the game! xD\n**Current Players:** " + players
		});

	}
}

function winMessage(user, channelID)
{
	bot.sendMessage(
	{
		to: channelID,
		message: user + " **wins**! OwO"
	});
	//add score to player
	scores[player_index] += 1;
}

function notYourTurn(user, channelID)
{
	bot.sendMessage(
	{
		to: channelID,
		message: "It's not your turn, " + user + "! ÒwÓ\nIt's **" + players[player_index] + "**'s turn!" 
	});
}

function turnNow(user, channelID)
{
	bot.sendMessage(
	{
		to: channelID,
		message: "It's **" + user + "**'s turn now! :3"
	});
}

function nextPlayer()
{
	if(player_index+1 <= players.length-1)
	{
		player_index++;
	}
	else
	{
		player_index = 0;
	}
}

function showScores(channelID)
{
	if(players.length > 0) //show scores
	{
		scoresString = "";
		for(i=0; i<players.length; i++)
		{
			scoresString += players[i] + ": " + scores[i] + "\n";
		}
		//display
		bot.sendMessage(
		{
			to: channelID,
			message: "**Scores:**\n" + scoresString
		});
	}
	else //no players/scores
	{
		bot.sendMessage(
		{
			to: channelID,
			message: "No scores to show. owo"
		});
	}
}