const DiscordEval = require('discord-eval.js')
const Markov = require('markov-strings').default
const fs = require('fs').promises
const Discord = require('discord.js')
const tims = require('tims')

const Enmap = require("enmap");
const db = new Enmap({name: "guilds", dataDir: './botdata/data'});

const markov = new Markov({ stateSize: 2 })
markov.import(JSON.parse(require('fs').readFileSync('./model.json')))


const FOOTER = 'Eddy 2020 | Made by Loockeeer#8522'
const GREEN  = 0x369517
const RED    = 0x9d0b0e

function generate(str) {
    const options = {
        filter() {
            return true
        }
    }
    markov.addData([str])
    return markov.generate(options).string
}

function generateEmbed(guild, content, color) {
    const embed = new Discord.MessageEmbed() 
    embed.setAuthor(guild.name, guild.iconURL())
    embed.setDescription(content)
    embed.setColor(color)
    embed.setFooter(FOOTER)
    embed.setTimestamp()
    return embed
}

function isAdmin(member) {
    return member.permissions.has('MANAGE_GUILD', true)
}


const io = require('@pm2/io')

const talkcount = io.counter({
  name: 'Count of messages sent to Eddy',
  id: 'app/talk/count'
})


const client = new Discord.Client()

client.login(process.env.TOKEN)

client.on("ready", () => {
    console.log('Eddy ready !')

    client.user.setPresence({ activity: { name: process.env.PREFIX+'help', url: 'https://www.twitch.tv/aypierre', type: 'streaming' }, status: 'online' })
    client.db = db
})

client.on('message', async message => {
    if(message.author.bot || message.system) return;
    if(!db.has(message.guild.id)) {
        db.set(message.guild.id, {prefix: process.env.PREFIX})
    }
    console.log(`${message.guild.name} | #${message.channel.name} | @${message.author.tag} | ${message.content}`)
    if(message.content.replace("!","").includes(client.user.toString())) return message.channel.send(message.guild.members.cache.filter(m=>!m.user.bot).random().user.toString()+" :p")
    const prefix = db.get(message.guild.id, "prefix")

    if(db.get(message.guild.id, "channelID") === message.channel.id) {
        if(!message.content.startsWith('\\')) {
           
            message.channel.send(
                generate(message.content)
                    .replace(/eddy/ig ,message.member.displayName)
                    .replace('!talk ', '')
            )
           
            talkcount.inc()
            await fs.writeFile('./model.json', JSON.stringify(markov.export()))
        }
        return;
    }

    if(db.has(message.guild.id, "autoTalk") && !message.content.startsWith(prefix)) {
        if(Math.random() > db.get(message.guild.id, "autoTalk")) {
       
          message.channel.send(generate(message.content)
            .replace(/eddy/ig, message.member.displayName)
            .replace('!talk ', '')
          )
          
          talkcount.inc()
          await fs.writeFile('./model.json', JSON.stringify(markov.export()))
        }
    }

    if(!message.content.startsWith(prefix)) return;
    const args = message.content.trim().split(' ')
    const command = args.shift().replace(prefix, "")
    const cleanContent = message.content.replace(prefix+command, "")

    if(command === "talk") {
       
     
        message.channel.send(generate(cleanContent)
            .replace(/eddy/ig,message.member.displayName)
            .replace('!talk ', '')
        )
        talkcount.inc()
        await fs.writeFile('./model.json', JSON.stringify(markov.export()))
    }

    if(command === "setChannel") {
        if(!isAdmin(message.member)) return message.react('❌')
        if(args.length === 0) {
            db.set(message.guild.id, message.channel.id, "channelID")
            return message.channel.send(generateEmbed(message.guild, `Je parlerai dans ${message.channel}`, GREEN))
        }
        else {
            if(message.mentions.channels.size !== 0) {
                const channel = message.mentions.channels.first();
                if(channel.guild.id !== message.guild.id) {
                    return message.channel.send(generateEmbed(message.guild, `Vous devez donner un salon appartenant à ce serveur !`, RED))
                }
                else {
                    db.set(message.guild.id, channel.id, "channelID")
                    return message.channel.send(generateEmbed(message.guild, `Je parlerai dans ${channel}`, GREEN))
                }
            }
            else {
                let channel = message.guild.channels.cache.filter(channel => channel.isText()).find(channel => {
                    return channel.id === args[0] || channel.name.includes(args[0])
                })

                if(!channel) {
                    return message.channel.send(generateEmbed(message.guild, `Ce salon n'existe pas. Essayez de le mentionner ou de donner son ID`, RED))
                }
                db.set(message.guild.id, channel.id, "channelID")
                return message.channel.send(generateEmbed(message.guild, `Je parlerai dans ${channel}`, GREEN))
            }
        }
    }

    if(command === "removeChannel") {
        if(!isAdmin(message.member)) return message.react('❌')
        db.set(message.guild.id, '', "channelID")
        return message.channel.send(generateEmbed(message.guild, `Je ne parlerai plus dans le salon du serveur`, GREEN))
    }

    if(command === "autoTalk") {
        if(!isAdmin(message.member)) return message.react('❌')
        if(args[0] === "remove") {
            db.remove(message.guild.id, "autoTalk")
            return message.channel.send(generateEmbed(message.guild, `La fonctionnalité autoTalk a bien été désactivée sur votre serveur`, GREEN))
        }
        else {
            if(isNaN(args[0])) {
                return message.channel.send(generateEmbed(message.guild, `Vous devez renseigner une probabilité correcte (0%-100)`, RED))
            }
            let probability = Number(args[0])
            if(probability < 0 || probability > 100) {
                return message.channel.send(generateEmbed(message.guild, `Vous devez renseigner une probabilité correcte (0%-100)`, RED))
            }

            probability = (100 - probability) / 100

            db.set(message.guild.id, probability, "autoTalk")
            
            return message.channel.send(generateEmbed(message.guild, `La fonctionnalité autoTalk a bien été activée sur votre serveur. Probabilité : ${args[0]}%`, GREEN))
        }
    }
    
    if(command === "prefix") {
        if(args.length === 0) {
            return message.channel.send(generateEmbed(message.guild, `Mon préfix sur ce serveur est ${prefix}`))
        }
        else {
            if(!isAdmin(message.member)) return message.react('❌')
            db.set(message.guild.id, args[0], "prefix")
            return message.channel.send(generateEmbed(message.guild, `Le prefix du serveur a été changé sur ${args[0]}`, GREEN))
        }
    }

    if(command === "help") {
        const embed = new Discord.MessageEmbed()

        embed.setAuthor(message.guild.name, message.guild.iconURL())

        embed.addField("talk <message>", "Parler avec eddy")
        embed.addField("setChannel <channelMention|channelID|channelName>", "Changer le salon de eddy | Permission : `MANAGE_GUILD`")
        embed.addField("removeChannel", "Désactive le salon de eddy | Permission : `MANAGE_GUILD`")
        embed.addField("autoTalk remove|<probability>", "Désactive / Change la probabilité de l'auto talk de eddy | Permission : `MANAGE_GUILD`")
        embed.addField("prefix [prefix]", "Change le prefix de eddy sur le serveur / Donne le prefix | Permission : `MANAGE_GUILD`")
        embed.addField('stats', "Affiche des statistiques sur Eddy")

        embed.setTimestamp()
        embed.setFooter(FOOTER)
        embed.setColor('RANDOM')

        return message.channel.send(embed)
    }

    if(command === "eval" && message.author.id === "272676235946098688") {
        const code = cleanContent.replace('```js', '').replace('```', '')
        await DiscordEval(code, message)
    }

    if(command === "stats") {
        client.guilds.cache.map(g=>g.fetch())
        const markovSize = (await fs.stat('./model.json')).size / 1000000.0 // MB
        const memoryUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // MB
        const guilds = client.guilds.cache.size
        const users = client.guilds.cache.map(g=>g.approximateMemberCount).reduce((a,b)=>a+b)
        const uptime = tims.text(client.uptime, {lang:"fr"})

        const embed = new Discord.MessageEmbed()
        embed.setAuthor(client.user.username, client.user.avatarURL())
        embed.addField("Taille du modèle", markovSize+"MB")
        embed.addField("Mémoire RAM utilisée", memoryUsed+"MB")
        embed.addField("Nombre de serveurs", guilds)
        embed.addField("Nombre d'utilisateurs", users)
        embed.addField('Uptime', uptime)
        
        embed.setTitle('Invitez moi !')
        embed.setURL(`https://discord.com/oauth2/authorize?client_id=703635083873091604&scope=bot&permissions=19520`)
    
        embed.setColor('RANDOM')
        embed.setFooter(FOOTER)
        embed.setTimestamp()
        
        return message.channel.send(embed)
    }
})
