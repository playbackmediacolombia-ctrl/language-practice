"""Italian: chants and songs (music mode), the phrasebook, and the coach's lines."""

CHANTS = [
    {"id": "it-chant-ciao", "level": 1, "kind": "chant", "title": "Ciao, ciao", "en": "Hi, hi", "bpm": 96, "lines": [
        ("Ciao, ciao, come stai?", "Hi, hi, how are you?"), ("Bene, bene, e tu come vai?", "Fine, fine, and how are you doing?"),
        ("Buongiorno, buonasera, buonanotte.", "Good morning, good evening, good night."), ("A domani, ci vediamo, ciao a tutte!", "See you tomorrow, see you soon, bye everyone!")]},
    {"id": "it-chant-settimana", "level": 2, "kind": "chant", "title": "I giorni della settimana", "en": "The days of the week", "bpm": 100, "lines": [
        ("Lunedì, martedì, mercoledì, tre.", "Monday, Tuesday, Wednesday: three."), ("Giovedì, venerdì, son cinque per me.", "Thursday, Friday, that's five for me."),
        ("Sabato e domenica, mi riposo un po'.", "Saturday and Sunday, I rest a bit."), ("E lunedì di nuovo ricomincerò!", "And on Monday I'll start all over again!")]},
    {"id": "it-chant-mercato", "level": 3, "kind": "song", "title": "Ieri al mercato", "en": "Yesterday at the market", "bpm": 92, "lines": [
        ("Ieri sono andata al mercato a comprar.", "Yesterday I went to the market to shop."), ("Ho preso pesche, pane e un po' di formaggio da portar.", "I got peaches, bread and a bit of cheese to take home."),
        ("Ho parlato con la signora del caffè,", "I talked with the coffee lady,"), ("e sono tornata a casa cantando per te!", "and I came home singing for you!")]},
    {"id": "it-chant-se-avessi", "level": 4, "kind": "song", "title": "Se avessi tempo", "en": "If I had time", "bpm": 88, "lines": [
        ("Se avessi tempo, andrei al mare.", "If I had time, I'd go to the sea."), ("Se avessi le ali, potrei volare.", "If I had wings, I could fly."),
        ("Ma oggi studio, passo dopo passo,", "But today I study, step after step,"), ("e ogni parola mi porta più in alto!", "and every word takes me higher!")]},
    {"id": "it-chant-speriamo", "level": 5, "kind": "song", "title": "Speriamo", "en": "Let's hope", "bpm": 84, "lines": [
        ("Speriamo che domani ci sia il sole.", "Let's hope the sun is out tomorrow."), ("Speriamo che tu mi scriva con parole d'amore.", "Let's hope you write to me with words of love."),
        ("Spero che tu continui, che non ti arrenda,", "I hope you keep going, that you don't give up,"), ("che ogni parola una porta ti apra e ti sorprenda!", "that every word opens a door and surprises you!")]},
    {"id": "it-chant-daje", "level": 6, "kind": "chant", "title": "Daje, raga!", "en": "Come on, guys!", "bpm": 104, "lines": [
        ("Daje, raga! Tutto a posto, tutto bene.", "Come on, guys! All good, all fine."), ("Parlo italiano e mi scorre nelle vene.", "I speak Italian and it runs through my veins."),
        ("Non mi vergogno, ci provo e via,", "I'm not shy, I give it a go and off I go,"), ("e se sbaglio, rido, e continuo in compagnia!", "and if I get it wrong, I laugh and keep going with friends!")]},
]

PHRASES = {
    "greet-hello": "Ciao", "greet-goodbye": "Arrivederci", "greet-thanks": "Grazie", "greet-how-are-you": "Come stai?", "greet-fine": "Sto bene, grazie.",
    "greet-name-q": "Come ti chiami?", "greet-name-a": "Mi chiamo Anna.", "greet-nice": "Piacere.",
    "food-hungry": "Ho fame.", "food-water": "Acqua, per favore.", "food-menu": "Il menù, per favore.", "food-coffee": "Vorrei un caffè.",
    "food-delicious": "È buonissimo!", "food-no-meat": "Non mangio carne.", "food-check": "Il conto, per favore.", "food-cheers": "Salute!",
    "travel-airport": "Dov'è l'aeroporto?", "travel-hotel": "Dov'è l'albergo?", "travel-reservation": "Ho una prenotazione.", "travel-ticket": "Un biglietto, per favore.",
    "travel-cost": "Quanto costa?", "travel-taxi": "Ho bisogno di un taxi.", "travel-train": "A che ora parte il treno?", "travel-understand": "Non capisco.",
    "num-123": "Uno, due, tre.", "num-456": "Quattro, cinque, sei.", "num-7-10": "Sette, otto, nove, dieci.", "num-children": "Ho due figli.",
    "num-age-30": "Ho trent'anni.", "num-age": "Quanti anni hai?", "num-time": "Che ore sono?", "num-price": "Sono venti euro.",
    "dir-bathroom": "Dov'è il bagno?", "dir-left": "Giri a sinistra.", "dir-right": "Giri a destra.", "dir-straight": "Vada dritto.",
    "dir-far": "È lontano?", "dir-near": "È qui vicino.", "dir-metro": "Dov'è la stazione della metro?", "dir-help": "Mi può aiutare?",
}

FEEDBACK = {
    "praise": [("Molto bene!", "Very good!"), ("Eccellente!", "Excellent!"), ("Perfetto!", "Perfect!"), ("Ottimo!", "Great!"), ("Esatto!", "Exactly!"),
               ("Benissimo!", "Very well!"), ("Giusto!", "Right!"), ("Fantastico!", "Fantastic!"), ("Così si fa!", "That's how it's done!"), ("Che bello!", "How lovely!"),
               ("Ben fatto!", "Well done!"), ("Ce l'hai fatta!", "You got it!"), ("Magnifico!", "Wonderful!")],
    "streak": [("Stai andando alla grande!", "You're doing great!"), ("Inarrestabile!", "Unstoppable!"), ("Che serie!", "What a streak!"),
               ("Continua così!", "Keep it up!"), ("Sei una stella!", "You're a star!")],
    "complete": [("Lezione finita! Molto bene!", "Lesson finished! Very good!"), ("Ce l'hai fatta!", "You did it!"), ("Che bel lavoro!", "Great work!"),
                 ("Complimenti!", "Congratulations!"), ("Oggi hai fatto un lavoro fantastico!", "Fantastic work today!")],
    "perfect": [("Perfetto, nessun errore!", "Perfect, no mistakes!"), ("Neanche un errore! Incredibile!", "Not a single mistake! Incredible!"),
                ("Tutto giusto! Sei un genio!", "All correct! You're a genius!")],
    "wrong": [("Quasi.", "Almost."), ("Non fa niente.", "It doesn't matter."), ("Riprova.", "Try again."), ("Piano piano.", "Little by little."),
              ("Ci sei quasi.", "You're nearly there."), ("Ancora una volta, ce la fai.", "Once more, you can do it."), ("Così si impara.", "That's how you learn."),
              ("Non ti preoccupare.", "Don't worry.")],
}
