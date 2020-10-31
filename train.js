const db = require('better-sqlite3')('./corpus.sqlite3')
const Markov = require('markov-strings').default

function generateCorpus() {
    return db.prepare('select content from message').map(row => row.content)
}

const corpus = generateCorpus()

const markov = new Markov({ stateSize: 2 })

console.log("Start training")
markov.addData(corpus)
console.log("Training done")

fs.writeFileSync('./model.json', JSON.stringify(markov.export()))

