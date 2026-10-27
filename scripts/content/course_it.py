"""Italian course (Rome and Milan), in the same outline as the other languages.
Run scripts/content/build.py to write shared/course/it.json."""

S = {"kind": "sound"}

UNITS = [
    ("u1", "The sounds of Italian", [
        ("Five pure vowels", [
            ("a", "“ah”, as in father", S), ("e", "“eh”, as in bed", S), ("i", "“ee”, as in see", S), ("o", "“oh”, short and pure", S), ("u", "“oo”, as in food", S),
        ]),
        ("Ca, ci, che, chi", [
            ("ca", "“kah”", S), ("ci", "“chee”", S), ("chi", "“kee”", S), ("casa", "house"), ("ciao", "hi / bye"), ("amiche", "friends (women)"),
        ]),
        ("Double consonants", [
            ("nono", "ninth"), ("nonno", "grandpa"), ("sete", "thirst"), ("sette", "seven"), ("pala", "shovel"), ("palla", "ball"),
        ]),
        ("Gli, gn and sc", [
            ("figlio", "son"), ("famiglia", "family"), ("bagno", "bathroom"), ("gnocchi", "gnocchi"), ("pesce", "fish"), ("sci", "skiing"),
        ]),
    ]),
    ("u2", "First words", [
        ("Hello and goodbye", [
            ("buongiorno", "good morning"), ("arrivederci", "goodbye"), ("sì", "yes"), ("no", "no"), ("Ciao, mamma.", "Hi, mom."), ("Ciao, papà.", "Bye, dad."),
        ]),
        ("Please and thank you", [
            ("grazie", "thank you"), ("per favore", "please"), ("acqua", "water"), ("Sì, grazie.", "Yes, thank you."), ("No, grazie.", "No, thank you."), ("Acqua, per favore.", "Water, please."),
        ]),
        ("Food and drink", [
            ("latte", "milk"), ("pane", "bread"), ("mela", "apple"), ("Voglio il latte.", "I want milk."), ("Voglio il pane.", "I want bread."), ("Ancora acqua.", "More water."),
        ]),
        ("Animals and home", [
            ("gatto", "cat"), ("cane", "dog"), ("il cane", "the dog"), ("il gatto", "the cat"), ("la mia casa", "my house"), ("la mia mamma", "my mom"),
        ]),
    ]),
    ("u3", "Family and home", [
        ("My family", [
            ("fratello", "brother"), ("sorella", "sister"), ("nonna", "grandma"), ("zio", "uncle"), ("È mio fratello.", "He's my brother."), ("Ho una sorella.", "I have a sister."),
        ]),
        ("At home", [
            ("cucina", "kitchen"), ("camera", "bedroom"), ("letto", "bed"), ("porta", "door"), ("La mia camera è grande.", "My bedroom is big."), ("La casa è piccola.", "The house is small."),
        ]),
        ("Eat and sleep", [
            ("mangiare", "to eat"), ("dormire", "to sleep"), ("Ho fame.", "I'm hungry."), ("Ho sonno.", "I'm sleepy."), ("Buonanotte.", "Good night."), ("Andiamo a mangiare.", "Let's go and eat."),
        ]),
    ]),
    ("u4", "I want, I have, I like", [
        ("I want to…", [
            ("giocare", "to play"), ("Voglio giocare.", "I want to play."), ("Voglio dormire.", "I want to sleep."), ("Vuoi dell'acqua?", "Do you want some water?"),
            ("Non voglio.", "I don't want to."), ("Voglio andare a casa.", "I want to go home."),
        ]),
        ("I have", [
            ("pallone", "football, ball"), ("libro", "book"), ("Ho un libro.", "I have a book."), ("Hai una matita?", "Do you have a pencil?"),
            ("Non ho fratelli.", "I don't have any brothers or sisters."), ("Lei ha un cane.", "She has a dog."),
        ]),
        ("I like", [
            ("cioccolato", "chocolate"), ("mi piace", "I like"), ("Mi piace il cioccolato.", "I like chocolate."), ("Non mi piace il latte.", "I don't like milk."),
            ("Ti piacciono i cani?", "Do you like dogs?"), ("Lo adoro!", "I love it!"),
        ]),
    ]),
    ("u5", "Colors, numbers and questions", [
        ("Colors", [
            ("blu", "blue"), ("verde", "green"), ("giallo", "yellow"), ("bianco", "white"), ("La macchina è blu.", "The car is blue."), ("la casa bianca", "the white house"),
        ]),
        ("How many?", [
            ("due gatti", "two cats"), ("tre mele", "three apples"), ("cinque libri", "five books"), ("dieci cani", "ten dogs"), ("Quanti anni hai?", "How old are you?"),
            ("Ho sette anni.", "I'm seven years old."),
        ]),
        ("What? Who? Where?", [
            ("Che cos'è?", "What is it?"), ("Chi è?", "Who is it?"), ("Dov'è la mamma?", "Where is mom?"), ("Perché?", "Why?"), ("È un gatto.", "It's a cat."),
            ("Come ti chiami?", "What's your name?"),
        ]),
    ]),
    ("u6", "Where things are", [
        ("In, on, under", [
            ("in", "in"), ("sotto", "under"), ("sopra", "on top of"), ("Il libro è sul tavolo.", "The book is on the table."),
            ("Il gatto è sotto il letto.", "The cat is under the bed."), ("Il latte è in cucina.", "The milk is in the kitchen."),
        ]),
        ("Here and there", [
            ("qui", "here"), ("lì", "there"), ("vicino", "near"), ("lontano", "far"), ("Il bagno è lì.", "The bathroom is over there."), ("È vicino?", "Is it near?"),
        ]),
        ("Left and right", [
            ("sinistra", "left"), ("destra", "right"), ("dritto", "straight ahead"), ("Gira a sinistra.", "Turn left."), ("Vai dritto.", "Go straight ahead."), ("È a destra.", "It's on the right."),
        ]),
    ]),
    ("u7", "Meeting people", [
        ("Names", [
            ("nome", "name"), ("Qual è il tuo nome?", "What's your name?"), ("Mi chiamo Anna.", "My name is Anna."), ("Piacere.", "Nice to meet you."),
            ("Piacere mio.", "The pleasure is mine."), ("Ti presento il mio amico.", "Let me introduce my friend."),
        ]),
        ("Where are you from?", [
            ("Di dove sei?", "Where are you from?"), ("Sono degli Stati Uniti.", "I'm from the United States."), ("Dove abiti?", "Where do you live?"),
            ("Abito a Roma.", "I live in Rome."), ("Parli inglese?", "Do you speak English?"), ("Parlo un po' d'italiano.", "I speak a little Italian."),
        ]),
        ("Getting to know you", [
            ("Come stai?", "How are you?"), ("Bene, e tu?", "Fine, and you?"), ("Che lavoro fai?", "What do you do for a living?"),
            ("Sono insegnante.", "I'm a teacher."), ("Ho trent'anni.", "I'm thirty years old."), ("Sono sposato.", "I'm married. (man)"),
        ]),
    ]),
    ("u8", "Shopping and eating out", [
        ("At the shop", [
            ("Quanto costa?", "How much does it cost?"), ("È troppo caro.", "It's too expensive."), ("È economico.", "It's cheap."), ("Lo prendo.", "I'll take it."),
            ("Ha un'altra taglia?", "Do you have another size?"), ("Sto solo guardando, grazie.", "I'm just looking, thanks."),
        ]),
        ("At the restaurant", [
            ("Un tavolo per due, per favore.", "A table for two, please."), ("Il menù, per favore.", "The menu, please."), ("Cosa mi consiglia?", "What do you recommend?"),
            ("Il conto, per favore.", "The check, please."), ("Posso pagare con la carta?", "Can I pay by card?"), ("Il coperto è incluso?", "Is the cover charge included?"),
        ]),
        ("Ordering food", [
            ("Vorrei un caffè.", "I'd like a coffee."), ("Per me, il pollo.", "The chicken for me."), ("senza cipolla", "without onion"),
            ("Sono vegetariana.", "I'm vegetarian. (woman)"), ("È buonissimo!", "It's delicious!"), ("Mi porta un bicchiere d'acqua?", "Could you bring me a glass of water?"),
        ]),
    ]),
    ("u9", "My day", [
        ("Morning routine", [
            ("Mi alzo alle sette.", "I get up at seven."), ("Faccio la doccia.", "I take a shower."), ("A colazione prendo un cappuccino e un cornetto.", "For breakfast I have a cappuccino and a croissant."),
            ("Mi vesto.", "I get dressed."), ("Esco di casa alle otto.", "I leave home at eight."), ("Vado al lavoro in autobus.", "I go to work by bus."),
        ]),
        ("Time and days", [
            ("Che ore sono?", "What time is it?"), ("Sono le tre.", "It's three o'clock."), ("oggi", "today"), ("domani", "tomorrow"), ("ieri", "yesterday"),
            ("Il lunedì lavoro.", "On Mondays I work."),
        ]),
        ("What did you do?", [
            ("Cosa hai fatto ieri?", "What did you do yesterday?"), ("Sono andato al parco.", "I went to the park. (man)"), ("Ho mangiato con la mia famiglia.", "I ate with my family."),
            ("Ho visto un film.", "I watched a movie."), ("Sono stata a casa tutto il giorno.", "I was home all day. (woman)"), ("Mi sono divertito un sacco.", "I had a great time. (man)"),
        ]),
    ]),
    ("u10", "Telling stories", [
        ("Once upon a time", [
            ("C'era una volta una bambina.", "Once upon a time there was a girl."), ("Abitava in un piccolo paese.", "She lived in a small village."),
            ("Ogni giorno andava al fiume.", "Every day she went to the river."), ("Un giorno trovò una scatola.", "One day she found a box."),
            ("all'improvviso", "suddenly"), ("E vissero felici e contenti.", "And they lived happily ever after."),
        ]),
        ("Describing people", [
            ("È alto e magro.", "He's tall and thin."), ("Ha i capelli lunghi.", "She has long hair."), ("Porta gli occhiali.", "He wears glasses."),
            ("È molto simpatica.", "She's very nice."), ("È un po' timido.", "He's a bit shy."), ("Somiglia a sua madre.", "She looks like her mother."),
        ]),
        ("First, then, finally", [
            ("prima", "first"), ("poi", "then"), ("alla fine", "in the end"), ("Mentre cucinavo, è squillato il telefono.", "While I was cooking, the phone rang."),
            ("Quando sono arrivato, era già andato via.", "When I arrived, he had already left."), ("Per questo sono arrivato tardi.", "That's why I was late."),
        ]),
    ]),
    ("u11", "Messages and plans", [
        ("Text messages", [
            ("Ci vediamo dopo.", "See you later."), ("Sono un po' in ritardo.", "I'm running a bit late."), ("Sono arrivato.", "I'm here. (man)"),
            ("Mi puoi chiamare?", "Can you call me?"), ("Ti scrivo più tardi.", "I'll text you later."), ("Fammi sapere quando arrivi.", "Let me know when you get there."),
        ]),
        ("Invitations", [
            ("Vuoi venire alla mia festa?", "Do you want to come to my party?"), ("Certo!", "Of course!"), ("Grazie dell'invito.", "Thanks for the invitation."),
            ("Mi dispiace, non posso.", "Sorry, I can't."), ("Ho già un altro impegno.", "I already have another commitment."), ("Sarà per la prossima volta!", "Next time, for sure!"),
        ]),
        ("Making plans", [
            ("Sei libero sabato?", "Are you free on Saturday? (to a man)"), ("Che ne dici di andare al cinema?", "How about going to the movies?"),
            ("Ci vediamo alle otto in piazza.", "Let's meet at eight in the square."), ("Prenoto un tavolo.", "I'll book a table."),
            ("Se piove, restiamo a casa.", "If it rains, we'll stay home."), ("Mi sembra perfetto.", "Sounds perfect to me."),
        ]),
    ]),
    ("u12", "Work and money", [
        ("At the office", [
            ("la riunione", "the meeting"), ("il capo", "the boss"), ("il collega", "the coworker"), ("Ho una riunione alle dieci.", "I have a meeting at ten."),
            ("La relazione deve essere pronta per venerdì.", "The report has to be ready by Friday."), ("Sono sommerso dal lavoro.", "I'm swamped with work. (man)"),
        ]),
        ("The job interview", [
            ("esperienza", "experience"), ("Ho cinque anni di esperienza nelle vendite.", "I have five years of experience in sales."),
            ("Quali sono i suoi punti di forza?", "What are your strengths?"), ("Lavoro bene in squadra.", "I work well in a team."),
            ("Perché vuole questo posto?", "Why do you want this position?"), ("Quando potrebbe cominciare?", "When could you start?"),
        ]),
        ("Money", [
            ("lo stipendio", "the salary"), ("l'affitto", "the rent"), ("Devo pagare l'affitto.", "I have to pay the rent."),
            ("Vorrei aprire un conto.", "I'd like to open an account."), ("Sto risparmiando per un viaggio.", "I'm saving up for a trip."), ("Mi hanno fatto pagare troppo.", "They overcharged me."),
        ]),
    ]),
    ("u13", "Health and feelings", [
        ("At the doctor", [
            ("Ho mal di testa.", "I have a headache."), ("Mi fa male qui.", "It hurts here."), ("Ho la febbre da ieri.", "I've had a fever since yesterday."),
            ("Sono allergico alla penicillina.", "I'm allergic to penicillin. (man)"), ("Prenda questo due volte al giorno.", "Take this twice a day."),
            ("Devo prendere un appuntamento dal medico.", "I need to make a doctor's appointment."),
        ]),
        ("How I feel", [
            ("Sono preoccupata per mio fratello.", "I'm worried about my brother. (woman)"), ("Sono molto stressato ultimamente.", "I've been very stressed lately. (man)"),
            ("Sono fiero di te.", "I'm proud of you. (man)"), ("Mi sento molto meglio.", "I feel much better."), ("Mi vergogno.", "I'm embarrassed."), ("Non ti preoccupare.", "Don't worry."),
        ]),
        ("Giving advice", [
            ("Dovresti riposarti.", "You should rest."), ("Se fossi in te, andrei dal medico.", "If I were you, I'd go to the doctor."),
            ("Al posto tuo, non gli direi niente.", "In your place, I wouldn't tell him anything."), ("Ti consiglio di dormire di più.", "I advise you to sleep more."),
            ("È importante che tu beva molta acqua.", "It's important that you drink lots of water."), ("Guarisci presto!", "Get well soon!"),
        ]),
    ]),
    ("u14", "Travel problems", [
        ("At the airport", [
            ("Il mio volo è stato cancellato.", "My flight was cancelled."), ("Ho perso il passaporto.", "I lost my passport."), ("La mia valigia non è arrivata.", "My suitcase didn't arrive."),
            ("Il volo è in ritardo di due ore.", "The flight is delayed two hours."), ("Ho perso la coincidenza.", "I missed my connection."),
            ("Potete mettermi su un altro volo?", "Can you put me on another flight?"),
        ]),
        ("Hotel complaints", [
            ("L'aria condizionata non funziona.", "The air conditioning doesn't work."), ("Non c'è acqua calda.", "There's no hot water."),
            ("C'è molto rumore in camera.", "It's very noisy in the room."), ("Potrei cambiare camera?", "Could I change rooms?"),
            ("Vorrei parlare con il direttore.", "I'd like to speak to the manager."), ("Non è quello che ho prenotato.", "This isn't what I booked."),
        ]),
        ("Asking for help", [
            ("Mi può aiutare, per favore?", "Could you help me, please?"), ("Mi hanno rubato il portafoglio.", "My wallet was stolen."),
            ("Vorrei fare una denuncia.", "I want to report it to the police."), ("Dov'è l'ambasciata?", "Where is the embassy?"),
            ("Chiami un'ambulanza!", "Call an ambulance!"), ("Mi sono perso.", "I'm lost. (man)"),
        ]),
    ]),
    ("u15", "News and opinions", [
        ("Headlines", [
            ("il governo", "the government"), ("le elezioni", "the elections"), ("l'economia", "the economy"), ("I prezzi sono saliti di nuovo.", "Prices have gone up again."),
            ("La disoccupazione è scesa per il terzo mese di fila.", "Unemployment fell for the third month in a row."), ("Migliaia di persone sono scese in piazza.", "Thousands of people took to the streets."),
        ]),
        ("Talking about the news", [
            ("Hai sentito che il ministro si è dimesso?", "Did you hear that the minister resigned?"), ("Secondo gli esperti, la situazione peggiorerà.", "According to experts, the situation will get worse."),
            ("L'ho visto al telegiornale ieri sera.", "I saw it on the news last night."), ("Dicono che lunedì ci sarà uno sciopero.", "They say there'll be a strike on Monday."),
            ("Non ci posso credere!", "I can't believe it!"), ("Bisogna controllare la fonte.", "You have to check the source."),
        ]),
        ("Giving your opinion", [
            ("Secondo me, è un errore.", "In my opinion, it's a mistake."), ("Penso che tu abbia ragione.", "I think you're right."),
            ("Non credo che sia giusto.", "I don't think it's fair."), ("Mi sembra che esagerino.", "It seems to me they're exaggerating."),
            ("Dal mio punto di vista, ci sono altre priorità.", "The way I see it, there are other priorities."), ("Dipende da come la vedi.", "It depends on how you look at it."),
        ]),
    ]),
    ("u16", "Debate", [
        ("Agreeing and disagreeing", [
            ("Sono completamente d'accordo.", "I completely agree."), ("Non sono per niente d'accordo.", "I don't agree at all."),
            ("Capisco il tuo punto di vista, ma non la vedo così.", "I see your point, but I don't see it that way."), ("Su questo hai ragione.", "You're right about that."),
            ("Fino a un certo punto, sì.", "Up to a point, yes."), ("Neanche per sogno!", "No way! (lit. not even in a dream)"),
        ]),
        ("Making your case", [
            ("Da un lato, costa meno.", "On the one hand, it costs less."), ("Dall'altro, inquina di più.", "On the other hand, it pollutes more."),
            ("Non è del tutto vero.", "That's not entirely true."), ("Bisogna tenere conto dei costi.", "You have to take the costs into account."),
            ("Anche se è difficile, ne vale la pena.", "Even if it's hard, it's worth it."), ("tuttavia", "however"),
        ]),
        ("Persuading and concluding", [
            ("I dati dimostrano il contrario.", "The data show the opposite."), ("Immagina se succedesse a te.", "Imagine if it happened to you."),
            ("Non si tratta di soldi, ma di principi.", "It's not about money, it's about principles."), ("Insomma, ci vuole un cambiamento.", "In short, we need a change."),
            ("Per concludere, vorrei ringraziare tutti.", "To conclude, I'd like to thank everyone."), ("Siamo d'accordo di non essere d'accordo.", "Let's agree to disagree."),
        ]),
    ]),
    ("u17", "Formal and casual", [
        ("Tu or Lei?", [
            ("Come sta?", "How are you? (formal)"), ("Ehi, come va?", "Hey, how's it going? (casual)"), ("Possiamo darci del tu?", "Can we use “tu” with each other?"),
            ("Buongiorno, signora.", "Good morning, ma'am."), ("Prego, si accomodi.", "Please, come in and sit down."), ("Prego!", "You're welcome!"),
        ]),
        ("Polite requests", [
            ("Sarebbe così gentile da aiutarmi?", "Would you be so kind as to help me?"), ("Le sarei grato se mi rispondesse presto.", "I would be grateful if you replied soon. (man)"),
            ("Mi saprebbe dire dov'è l'ufficio?", "Could you tell me where the office is?"), ("Scusi il disturbo.", "Sorry to bother you."),
            ("Passami il sale.", "Pass me the salt. (casual)"), ("Mi fa un caffè, per favore?", "Can I have a coffee, please?"),
        ]),
        ("Formal writing", [
            ("Gentile signor Rossi,", "Dear Mr. Rossi,"), ("Le scrivo per chiedere alcune informazioni.", "I am writing to ask for some information."),
            ("In allegato trova il mio curriculum.", "Please find my résumé attached."), ("Resto in attesa di una sua risposta.", "I look forward to your reply."),
            ("Cordiali saluti,", "Kind regards,"), ("Un abbraccio,", "Hugs, (to a friend)"),
        ]),
    ]),
    ("u18", "Idioms", [
        ("Everyday idioms", [
            ("Hai la testa tra le nuvole.", "You're daydreaming. (lit. your head is in the clouds)"), ("Mi è costato un occhio della testa.", "It cost me an arm and a leg."),
            ("Non ha peli sulla lingua.", "She doesn't mince her words."), ("Ho fatto una gaffe.", "I put my foot in it."),
            ("Mi stai prendendo in giro.", "You're pulling my leg."), ("È un gioco da ragazzi.", "It's a piece of cake. (lit. a kids' game)"),
        ]),
        ("More idioms", [
            ("Hai colpito nel segno.", "You hit the nail on the head."), ("Sono stanco morto.", "I'm dead tired. (man)"), ("Datti una mossa!", "Get a move on!"),
            ("Non ho chiuso occhio tutta la notte.", "I didn't sleep a wink all night."), ("Sono tra l'incudine e il martello.", "I'm between a rock and a hard place."),
            ("Parla come una macchinetta.", "He talks nonstop."),
        ]),
        ("Sayings", [
            ("Meglio tardi che mai.", "Better late than never."), ("Il silenzio è d'oro.", "Silence is golden."), ("Chi dorme non piglia pesci.", "You snooze, you lose. (lit. sleepers catch no fish)"),
            ("Tra il dire e il fare c'è di mezzo il mare.", "Easier said than done. (lit. between saying and doing there's the sea)"),
            ("Non tutto il male vien per nuocere.", "Every cloud has a silver lining."), ("Dimmi con chi vai e ti dirò chi sei.", "You are the company you keep."),
        ]),
    ]),
    ("u19", "Slang", [
        ("Italian slang", [
            ("Che figata!", "How cool!"), ("Dai!", "Come on! / No way!"), ("Boh.", "Dunno."), ("Magari!", "I wish!"), ("Daje!", "Let's go! (Rome)"), ("Che figo!", "How cool! / He's hot!"),
        ]),
        ("Fillers and reactions", [
            ("cioè", "I mean, like"), ("Allora…", "So… / Well…"), ("Davvero?", "Really?"), ("Che figuraccia!", "How embarrassing!"), ("Pazienza.", "Oh well, never mind."),
            ("Mamma mia!", "Oh my goodness!"),
        ]),
        ("Talking casually", [
            ("A che serve?", "What's the point?"), ("Non mi va.", "I don't feel like it."), ("Sono al verde.", "I'm broke. (lit. at the green)"), ("Ehi, bella! Tutto a posto?", "Hey, friend! All good?"),
            ("Tranquillo, tutto a posto.", "Don't worry, everything's fine."), ("Ci si becca!", "Catch you later!"),
        ]),
    ]),
    ("u20", "Fluent conversation", [
        ("Small talk with nuance", [
            ("Quanto tempo!", "Long time no see!"), ("Che fine avevi fatto?", "Where have you been all this time?"), ("Si tira avanti.", "Getting by."),
            ("Non me ne parlare.", "Don't even get me started."), ("Sono contento che ti vada bene.", "I'm glad things are going well for you. (man)"),
            ("Dobbiamo vederci uno di questi giorni.", "We must get together one of these days."),
        ]),
        ("Telling a story well", [
            ("Non ci crederai, ma…", "You won't believe it, but…"), ("Insomma, si era dimenticato.", "Basically, he had forgotten."),
            ("Morale della favola: abbiamo perso il treno.", "Long story short, we missed the train."), ("E come se non bastasse, ha cominciato a piovere.", "And to top it all off, it started to rain."),
            ("Sono morto dal ridere.", "I died laughing. (man)"), ("Alla fine, è andato tutto bene.", "In the end, everything turned out fine."),
        ]),
        ("Clearing things up", [
            ("Quello che volevo dire è che…", "What I meant was that…"), ("In altre parole…", "In other words…"), ("Cosa intendi?", "What do you mean?"),
            ("Non fraintendermi.", "Don't get me wrong."), ("Mi spiego?", "Do you see what I mean?"), ("Ah, ora ho capito!", "Oh, now I get it!"),
        ]),
    ]),
    ("u21", "Dating & relationships", "dt-", [
        ("Meeting someone", [
            ("Ti dispiace se mi siedo qui?", "Do you mind if I sit here?"), ("E tu come conosci Laura?", "And how do you know Laura?"),
            ("Che bella musica qui!", "They play great music here!"), ("Mi piace un sacco il tuo stile.", "I really like your style."),
            ("Hai un sorriso bellissimo.", "You have a beautiful smile."), ("Oh, grazie! Che carino.", "Oh, thank you! That's sweet."),
        ]),
        ("Asking someone out", [
            ("Ti andrebbe di bere qualcosa uno di questi giorni?", "Would you like to get a drink one of these days?"), ("Che ne dici del cinema sabato?", "How about the movies on Saturday?"),
            ("Mi piacerebbe tanto!", "I'd love to!"), ("Questo weekend non posso, ma il prossimo?", "I can't this weekend, but how about the next one?"),
            ("Grazie, ma sto uscendo con qualcuno.", "Thanks, but I'm seeing someone."), ("Ti ringrazio, ma preferisco che restiamo amici.", "Thank you, but I'd rather we stay friends."),
        ]),
    ]),
    ("u22", "Texting & dating apps", "dt-", [
        ("Texting", [
            ("Ehi, come va?", "Hey, how's it going?", {"id": "dt-ehi-come-va"}), ("Ahahah, mi hai fatto ridere 😂", "Hahaha, you made me laugh 😂", {"say": "Mi hai fatto ridere."}),
            ("Ci organizziamo per giovedì?", "Shall we make plans for Thursday?"), ("Arrivata a casa. Grazie per la serata ❤️", "Got home. Thanks for this evening ❤️", {"say": "Arrivata a casa. Grazie per la serata."}),
            ("Scusa, mi ero dimenticato di risponderti 🙈", "Sorry, I forgot to reply 🙈", {"say": "Scusa, mi ero dimenticato di risponderti."}), ("Mi hai lasciato in visualizzato!", "You left me on read!"),
        ]),
        ("Dating apps", [
            ("Abbiamo fatto match!", "We matched!"), ("Mi ha fatto ridere la tua foto con il cane 🐶", "Your photo with the dog made me laugh 🐶", {"say": "Mi ha fatto ridere la tua foto con il cane."}),
            ("Qual è la cosa più spontanea che hai mai fatto?", "What's the most spontaneous thing you've ever done?"), ("Ci prendiamo un caffè e vediamo come va?", "Shall we grab a coffee and see how it goes?"),
            ("Per ora non cerco niente di serio.", "I'm not looking for anything serious right now."), ("Sei molto simpatico, ma non sento la chimica.", "You're really nice, but I don't feel the chemistry."),
        ]),
    ]),
    ("u23", "Love, couples & family", "dt-", [
        ("Talking about feelings", [
            ("Sto davvero bene con te.", "I feel really good with you."), ("Credo di essermi innamorato di te.", "I think I've fallen for you. (man)"),
            ("Vorrei capire a che punto siamo.", "I'd like to know where we stand."), ("Per me è importante che ci parliamo.", "It matters to me that we talk."),
            ("Ho bisogno di un po' di spazio, ma ti amo.", "I need a little space, but I love you."), ("Stiamo insieme da due anni e pensiamo di andare a convivere.", "We've been together two years and we're thinking of moving in together."),
        ]),
        ("Meeting the family", [
            ("Piacere, signora. Marco mi ha parlato tanto di voi.", "Nice to meet you, ma'am. Marco has told me so much about you all."), ("Vi ho portato un pensierino.", "I brought you a little something."),
            ("Che buono! L'ha preparato lei?", "This is delicious! Did you make it?"), ("La aiuto a sparecchiare.", "Let me help you clear the table."),
            ("Mia suocera è un tesoro.", "My mother-in-law is a treasure."), ("Ci vediamo domenica al pranzo di famiglia.", "See you Sunday at the family lunch."),
        ]),
    ]),
    ("u24", "Flirting with charm", "fl-", [
        ("Compliments", [
            ("Adoro come ridi.", "I love the way you laugh."), ("Hai una voce bellissima.", "You have a beautiful voice."), ("Quel colore ti sta benissimo.", "That color looks great on you."),
            ("Con te rido tantissimo.", "I laugh so much with you."), ("Hai degli occhi stupendi.", "You have gorgeous eyes."), ("Che bei gusti musicali!", "You have such good taste in music!"),
        ]),
        ("Reading the signals", [
            ("Ci stai provando con me?", "Are you hitting on me?"), ("Secondo me gli piaci.", "I think he likes you."), ("Non smette di guardarti.", "They can't stop looking at you."),
            ("Mi manda segnali, ma non so se è solo gentile.", "They're giving me signals, but I don't know if they're just being nice."),
            ("Se continua la conversazione, è un buon segno.", "If they keep the conversation going, it's a good sign."), ("Mi piacerebbe conoscerti meglio.", "I'd love to get to know you better."),
        ]),
    ]),
    ("u25", "Playful teasing & pick-up lines", "fl-", [
        ("Teasing and comebacks", [
            ("Sei sempre così o solo con me?", "Are you always like this, or just with me?"), ("Uh, qualcuno se la tira 😏", "Ooh, someone's showing off 😏", {"say": "Uh, qualcuno se la tira."}),
            ("Ho vinto di nuovo. Ammettilo.", "I won again. Admit it."), ("Non fare il finto tonto, ti ho visto sorridere.", "Don't play dumb, I saw you smile."),
            ("Mi devi un caffè per questa.", "You owe me a coffee for that one."), ("Va bene, hai vinto… per questa volta.", "Fine, you win… this time."),
        ]),
        ("Pick-up lines, smooth and cheesy", [
            ("Mi consigli qualcosa dal menù? Hai l'aria di chi se ne intende.", "Can you recommend something on the menu? You look like you'd know."),
            ("Credi nell'amore a prima vista, o devo ripassare?", "Do you believe in love at first sight, or should I walk by again?"),
            ("Hai una mappa? Mi sono perso nei tuoi occhi.", "Do you have a map? I got lost in your eyes."), ("Ti sei fatta male cadendo dal cielo?", "Did it hurt when you fell from heaven?"),
            ("Questa era pessima, ma ti ho fatto ridere.", "That one was terrible, but I made you laugh."), ("Posso offrirti qualcosa da bere?", "Can I buy you a drink?"),
        ]),
    ]),
    ("u26", "Flirty texts & clear signals", "fl-", [
        ("Flirty texts and app openers", [
            ("Due verità e una bugia: inizi tu 😉", "Two truths and a lie: you go first 😉", {"say": "Due verità e una bugia: inizi tu."}),
            ("La tua foto in montagna mi ha incuriosito. Dov'era?", "Your mountain photo got me curious. Where was it?"),
            ("Continuo a pensare alla nostra chiacchierata di ieri sera 🙈", "I keep thinking about our chat last night 🙈", {"say": "Continuo a pensare alla nostra chiacchierata di ieri sera."}),
            ("Buongiorno, dormito bene? ☀️", "Good morning, sleep well? ☀️", {"say": "Buongiorno, dormito bene?"}),
            ("Mi devi la rivincita a biliardo 😏", "You owe me a rematch at pool 😏", {"say": "Mi devi la rivincita a biliardo."}),
            ("Quando vuoi, rifacciamo 😘", "Let's do it again whenever you want 😘", {"say": "Quando vuoi, rifacciamo."}),
        ]),
        ("Smooth moves and graceful exits", [
            ("Mi stai molto simpatica. Posso chiederti il numero?", "I really like you. Can I ask for your number?"), ("Che ne dici se continuiamo a parlare da un'altra parte?", "How about we keep talking somewhere else?"),
            ("È stato bello conoscerti. Spero di rivederti.", "It was lovely meeting you. I hope to see you again."), ("Credo di aver frainteso. Scusa.", "I think I misread things. Sorry."),
            ("Nessun problema, è stato un piacere chiacchierare.", "No worries, it was a pleasure chatting."), ("Rispetto la tua risposta.", "I respect your answer."),
        ]),
    ]),
    ("u27", "Culture: greetings & gestures", "cu-", [
        ("Greetings and gestures", [
            ("Ciao, come va?", "Hi, how's it going?"), ("Buonasera!", "Good evening! (from mid-afternoon)"), ("Salve!", "Hello! (polite, neutral)"), ("Piacere di conoscerla.", "Nice to meet you. (formal)"),
            ("Un bacio, ci sentiamo!", "A kiss, talk soon! (a friendly goodbye)"), ("Permesso?", "May I? (entering a home or squeezing past)"),
        ], [
            {"q": "How many kisses on the cheek are usual between friends in Italy?", "options": ["Two", "One", "Four"], "answer": 0},
            {"q": "When do Italians start saying “Buonasera”?", "options": ["From mid-afternoon", "Only after midnight", "Only at dinner"], "answer": 0},
            {"q": "Fingertips pinched together, hand shaken up and down, means…", "options": ["“What do you want?” / “What are you saying?”", "“Delicious!”", "“Hello!”"], "answer": 0},
        ]),
    ]),
    ("u28", "Culture: food & table manners", "cu-", [
        ("Food and the table", [
            ("Buon appetito!", "Enjoy your meal!"), ("Cosa ci consiglia oggi?", "What do you recommend today?"), ("Ci porta il conto, per favore?", "Could you bring us the check, please?"),
            ("Un caffè, per favore.", "An espresso, please."), ("Era tutto buonissimo.", "Everything was delicious."), ("Posso portare via gli avanzi?", "Can I take the leftovers with me?"),
        ], [
            {"q": "“Un caffè” in an Italian bar is…", "options": ["An espresso", "A big filter coffee", "A latte"], "answer": 0},
            {"q": "Many Italians think a cappuccino is…", "options": ["A morning drink, not for after lunch or dinner", "Only for dessert", "Best with pizza"], "answer": 0},
            {"q": "The “coperto” on an Italian bill is…", "options": ["A small cover charge per person", "A tip you must leave", "A fine for being late"], "answer": 0},
        ]),
    ]),
    ("u29", "Culture: holidays & celebrations", "cu-", [
        ("Holidays and celebrations", [
            ("Buon Natale e felice anno nuovo!", "Merry Christmas and a happy New Year!"), ("Tanti auguri! Quanti anni compi?", "Happy birthday! How old are you turning?"),
            ("A Capodanno mangiamo le lenticchie.", "On New Year's Day we eat lentils."), ("La Befana porta le calze il sei gennaio.", "The Befana brings stockings on January 6."),
            ("A Ferragosto tutti vanno al mare.", "On Ferragosto everyone goes to the beach."), ("Lunedì è festa, facciamo il ponte!", "Monday's a holiday: we're making a long weekend of it!"),
        ], [
            {"q": "Why do Italians eat lentils at New Year?", "options": ["For money and luck in the new year", "Because they're cheap", "To end the Christmas diet"], "answer": 0},
            {"q": "Who is the Befana?", "options": ["A kind old witch who brings sweets on January 6", "Santa's wife", "A Carnival mask"], "answer": 0},
            {"q": "Ferragosto, on August 15, is…", "options": ["A summer holiday when cities empty out", "A wine harvest in October", "A school exam day"], "answer": 0},
        ]),
    ]),
    ("u30", "Culture: etiquette & mistakes to avoid", "cu-", [
        ("Etiquette and common mistakes", [
            ("Scusi, ho sbagliato.", "Sorry, I made a mistake."), ("Scusi, sa dov'è il bagno?", "Excuse me, do you know where the bathroom is?"),
            ("Torno subito.", "I'll be right back."), ("Tranquillo, non fa niente.", "Relax, it's no big deal."), ("Di niente!", "Don't mention it!"), ("Figurati!", "Not at all! / No problem!"),
        ], [
            {"q": "“Parenti” means…", "options": ["Relatives", "Parents only", "Friends"], "answer": 0},
            {"q": "In Italy, asking for parmesan on seafood pasta…", "options": ["Raises eyebrows: cheese and fish rarely mix", "Is the normal thing to do", "Is free everywhere"], "answer": 0},
            {"q": "To say “I'm hot” (the weather), Italians say…", "options": ["“Ho caldo” (I have heat)", "“Sono caldo”", "“È caldo io”"], "answer": 0},
        ]),
    ]),
    ("u31", "Culture: dialects and regional slang", "cu-", [
        ("Dialects and regional slang", [
            ("Daje, Roma!", "Come on, Rome! (Roman)"), ("Uè, guaglió!", "Hey, kid! (Naples)"), ("Che figo, raga!", "How cool, guys! (all over Italy)"),
            ("Va bene, ci vediamo alle otto.", "OK, see you at eight."), ("Mizzica!", "Wow! (Sicily)"), ("Ammazza!", "Wow! (Rome)"),
        ], [
            {"q": "“Daje!” sounds like someone from…", "options": ["Rome", "Milan", "Venice"], "answer": 0},
            {"q": "“Guaglió” (kid, buddy) is from…", "options": ["Naples", "Turin", "Sicily"], "answer": 0},
            {"q": "“Raga”, short for “ragazzi”, means…", "options": ["Guys / everyone", "Rain", "Money"], "answer": 0},
        ]),
    ]),
]
