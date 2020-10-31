const Markov = require('markov-strings').default
const fs = require('fs')
const Discord = require('discord')

const markov = new Markov({ stateSize: 2 })
markov.import(JSON.parse(fs.readFileSync('./model.json')))

function generate(str) {
    const options = {
        maxTries: 20,
        
        prng: Math.random,
        
        filter: (result) => {
            return true
        }
    }
    markov.addData(str)
    return markov.generate(options).string
}

const client = new Discord.Client()

client.login(process.env.TOKEN)

client.on("ready", () => {
    console.log('Eddy ready !')
})

client.on('message', message => {
    if(message.author.bot || message.system) return;

    if(message.content.startsWith(process.env.PREFIX+"talk ")) {
        const content = message.content.replace(process.env.PREFIx+"talk ", "")

        message.channel.send(generate(content))
        fs.writeFileSync('./model.json', JSON.stringify(markov.export()))
    }

    
    if(message.channel.id === "665906410881679360") {
        if(!message.content.startsWith('\\')) message.channel.send(generate(message.content))
        fs.writeFileSync('./model.json', JSON.stringify(markov.export()))
    }
})