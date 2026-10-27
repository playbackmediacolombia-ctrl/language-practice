"""Italian role-plays. Lines: ("t", text, en) is them, ("y", text, en) is you."""

SCENARIOS = [
    ("it-food-1", 1, "food", "Al bar", "At the café", "You're at a café in Rome. The barista greets you.", "Barista", [
        ("t", "Buongiorno! Cosa le preparo?", "Good morning! What can I make you?"), ("y", "Un cappuccino, per favore.", "A cappuccino, please."),
        ("t", "Qualcosa da mangiare?", "Anything to eat?"), ("y", "Sì, un cornetto.", "Yes, a croissant."),
        ("t", "Perfetto. Sono due euro e cinquanta.", "Perfect. That's two euros fifty."), ("y", "Ecco a lei. Grazie.", "Here you are. Thanks."), ("t", "Grazie a lei! Buona giornata.", "Thank you! Have a nice day."),
    ]),
    ("it-directions-1", 1, "directions", "Dov'è la banca?", "Where's the bank?", "You're in the town center and need a bank.", "Passer-by", [
        ("y", "Scusi, dov'è la banca?", "Excuse me, where's the bank?"), ("t", "È lì, all'angolo.", "It's there, on the corner."),
        ("y", "È vicino?", "Is it close?"), ("t", "Sì, molto vicino. Due minuti.", "Yes, very close. Two minutes."),
        ("y", "Grazie mille!", "Thanks a lot!"), ("t", "Prego!", "You're welcome!"),
    ]),
    ("it-shopping-1", 1, "shopping", "Al mercato", "At the market", "You're buying fruit at a market stall.", "Stallholder", [
        ("t", "Buongiorno! Cosa le do?", "Good morning! What can I get you?"), ("y", "Quanto costano le pesche?", "How much are the peaches?"),
        ("t", "Tre euro al chilo.", "Three euros a kilo."), ("y", "Un chilo, per favore.", "A kilo, please."),
        ("t", "Altro?", "Anything else?"), ("y", "No, basta così. Grazie.", "No, that's all. Thanks."),
    ]),
    ("it-smalltalk-2", 2, "smalltalk", "Conoscere qualcuno", "Meeting someone new", "At a friend's party, someone comes up to say hi.", "Giorgio", [
        ("t", "Ciao! Io sono Giorgio. Tu?", "Hi! I'm Giorgio. You?"), ("y", "Ciao, Giorgio! Io sono Emma.", "Hi, Giorgio! I'm Emma.", ["Ciao! Sono Emma."]),
        ("t", "Piacere, Emma! Di dove sei?", "Nice to meet you, Emma! Where are you from?"), ("y", "Sono del Canada.", "I'm from Canada."),
        ("t", "Che bello! Abiti qui a Milano?", "How lovely! Do you live here in Milan?"), ("y", "Sì, abito qui da sei mesi.", "Yes, I've lived here for six months."),
        ("t", "Benvenuta! Se hai bisogno di qualcosa, dimmi pure.", "Welcome! If you need anything, just tell me."),
    ]),
    ("it-doctor-2", 2, "doctor", "Dal medico", "At the doctor's", "You're not feeling well and see a doctor.", "Doctor", [
        ("t", "Buongiorno. Cosa si sente?", "Good morning. How are you feeling?"), ("y", "Ho mal di testa e la febbre.", "I have a headache and a fever."),
        ("t", "Da quando?", "Since when?"), ("y", "Da ieri.", "Since yesterday."),
        ("t", "Prenda questa medicina e si riposi.", "Take this medicine and rest."), ("y", "Grazie, dottore.", "Thank you, doctor."),
    ]),
    ("it-airport-2", 2, "airport", "Al check-in", "At the check-in desk", "You're checking in for your flight.", "Agent", [
        ("t", "Buongiorno. Il passaporto, per favore.", "Good morning. Your passport, please."), ("y", "Ecco.", "Here it is."),
        ("t", "Imbarca bagagli?", "Are you checking any bags?"), ("y", "Sì, una valigia.", "Yes, one suitcase."),
        ("t", "Preferisce finestrino o corridoio?", "Window or aisle?"), ("y", "Finestrino, per favore.", "Window, please."), ("t", "Ecco la carta d'imbarco. Uscita cinque, alle dieci.", "Here's your boarding pass. Gate five, at ten."),
    ]),
    ("it-food-3", 3, "food", "Un errore nell'ordine", "The wrong dish", "The waiter brought you the wrong dish.", "Waiter", [
        ("y", "Scusi, avevo ordinato il pesce, ma mi è arrivato il pollo.", "Excuse me, I ordered the fish, but I got the chicken.", ["Scusi, ho ordinato il pesce, ma è arrivato il pollo."]),
        ("t", "Mi scusi tanto! Glielo cambio subito.", "I'm so sorry! I'll change it right away."), ("y", "Grazie. Ci vorrà molto?", "Thanks. Will it take long?"),
        ("t", "Una decina di minuti. Intanto desidera qualcosa da bere?", "About ten minutes. Would you like something to drink meanwhile?"), ("y", "Sì, un'acqua frizzante, per favore.", "Yes, a sparkling water, please."),
        ("t", "L'acqua la offre la casa.", "The water is on the house."),
    ]),
    ("it-shopping-3", 3, "shopping", "Cambiare una camicia", "Exchanging a shirt", "You bought a shirt that's too small.", "Shop assistant", [
        ("y", "Buongiorno, ho comprato questa camicia ieri, ma è troppo piccola.", "Hello, I bought this shirt yesterday, but it's too small."), ("t", "Nessun problema. Ha lo scontrino?", "No problem. Do you have the receipt?"),
        ("y", "Sì, eccolo.", "Yes, here it is."), ("t", "Vuole cambiarla con una taglia più grande?", "Would you like to exchange it for a bigger size?"),
        ("y", "Sì, una media, per favore.", "Yes, a medium, please."), ("t", "Eccola. La vuole provare?", "Here you are. Would you like to try it on?"),
    ]),
    ("it-directions-3", 3, "directions", "Come arrivo al museo?", "Getting to the museum", "You want to visit the Vatican Museums by public transport.", "Local", [
        ("y", "Scusi, come arrivo ai Musei Vaticani?", "Excuse me, how do I get to the Vatican Museums?"), ("t", "Può prendere la metro A qui vicino.", "You can take metro line A near here."),
        ("y", "A quale fermata devo scendere?", "Which stop do I get off at?"), ("t", "A Ottaviano. Sono quattro fermate.", "At Ottaviano. It's four stops."),
        ("y", "E dove compro il biglietto?", "And where do I buy a ticket?"), ("t", "In tabaccheria o alle macchinette in stazione.", "At a tobacconist's or from the machines in the station."),
    ]),
    ("it-doctor-4", 4, "doctor", "Spiegare i sintomi", "Explaining your symptoms", "You've had stomach trouble for a few days.", "Doctor", [
        ("t", "Allora, mi racconti cosa succede.", "So, tell me what's going on."), ("y", "Sono tre giorni che ho mal di pancia.", "I've had a stomachache for three days."),
        ("t", "Ha mangiato qualcosa di diverso?", "Did you eat anything unusual?"), ("y", "Ho mangiato frutti di mare in un ristorantino sul porto.", "I ate seafood at a little restaurant by the harbor."),
        ("t", "Ha febbre o nausea?", "Any fever or nausea?"), ("y", "Un po' di nausea la mattina, ma niente febbre.", "A bit of nausea in the morning, but no fever."),
        ("t", "Le prescrivo degli esami del sangue, per sicurezza.", "I'll prescribe some blood tests, to be safe."),
    ]),
    ("it-airport-4", 4, "airport", "Bagaglio smarrito", "Lost luggage", "Your suitcase didn't come out at baggage claim.", "Airline agent", [
        ("y", "Buonasera. La mia valigia non è uscita sul nastro.", "Good evening. My suitcase didn't come out on the belt."), ("t", "Mi dispiace. Mi fa vedere lo scontrino del bagaglio?", "I'm sorry. Can you show me the baggage tag?"),
        ("y", "Certo. È una valigia blu, grande, con le rotelle.", "Sure. It's a big blue suitcase with wheels."), ("t", "È rimasta a Francoforte. Arriva domani con il primo volo.", "It stayed in Frankfurt. It'll arrive tomorrow on the first flight."),
        ("y", "Me la potete consegnare in albergo?", "Can you deliver it to my hotel?"), ("t", "Sì, certo. Mi serve solo l'indirizzo e un numero di telefono.", "Yes, of course. I just need the address and a phone number."),
    ]),
    ("it-smalltalk-4", 4, "smalltalk", "Com'è andato il weekend?", "How was your weekend?", "Monday morning, a coworker asks about your weekend.", "Coworker", [
        ("t", "Allora, com'è andato il weekend?", "So, how was your weekend?"), ("y", "Benissimo! Sono andata al lago con degli amici.", "Great! I went to the lake with some friends."),
        ("t", "Che invidia! Quale lago?", "I'm jealous! Which lake?"), ("y", "Il lago di Como. Era bellissimo.", "Lake Como. It was gorgeous."),
        ("t", "Io sono rimasto a casa a guardare una serie.", "I stayed home watching a series."), ("y", "Anche quello è un bel programma. Quale serie?", "That's a nice plan too. Which series?"),
    ]),
    ("it-food-5", 5, "food", "Una prenotazione per un gruppo", "Booking for a group", "You're organizing a work dinner for twelve.", "Restaurant manager", [
        ("y", "Buongiorno, vorrei prenotare un tavolo per dodici persone venerdì sera.", "Good morning, I'd like to book a table for twelve on Friday evening."), ("t", "Per che ora?", "For what time?"),
        ("y", "Alle otto, se possibile. Avete una sala più riservata?", "At eight, if possible. Do you have a more private room?"), ("t", "Abbiamo una saletta al piano di sopra. Per i gruppi facciamo un menù fisso.", "We have a small room upstairs. For groups we do a set menu."),
        ("y", "Perfetto. C'è un'opzione vegetariana?", "Perfect. Is there a vegetarian option?"), ("t", "Sì, certo. Le mando il menù per email.", "Yes, of course. I'll email you the menu."),
    ]),
    ("it-shopping-5", 5, "shopping", "La garanzia", "A warranty claim", "Your two-month-old laptop has stopped charging.", "Store clerk", [
        ("y", "Ho comprato questo portatile due mesi fa e ha smesso di caricarsi.", "I bought this laptop two months ago and it's stopped charging."), ("t", "Ha provato con un altro caricatore?", "Have you tried another charger?"),
        ("y", "Sì, e il problema rimane. È ancora in garanzia, vero?", "Yes, and the problem's still there. It's still under warranty, right?"), ("t", "Sì, lo mandiamo all'assistenza.", "Yes, we'll send it in for repair."),
        ("y", "Quanto ci vuole? Mi serve per lavorare.", "How long will it take? I need it for work."), ("t", "Fino a due settimane. Se non si può riparare, glielo sostituiamo.", "Up to two weeks. If it can't be repaired, we'll replace it."),
    ]),
    ("it-directions-5", 5, "directions", "Giorno di sciopero", "A transport strike", "A visitor asks you how to get to the airport during a strike.", "Visitor", [
        ("t", "Scusi, la metro è chiusa? Devo andare all'aeroporto.", "Excuse me, is the metro closed? I need to get to the airport."), ("y", "Oggi c'è sciopero. La metro non funziona.", "There's a strike today. The metro isn't running."),
        ("t", "Oh no! E adesso come faccio?", "Oh no! So what do I do now?"), ("y", "Le conviene prendere un taxi, ma parta con anticipo.", "You'd better take a taxi, but leave early."),
        ("t", "Ci sarà un traffico terribile.", "The traffic will be terrible."), ("y", "Sicuramente. Calcoli almeno un'ora e mezza.", "Definitely. Allow at least an hour and a half."),
    ]),
    ("it-smalltalk-6", 6, "smalltalk", "A un evento di lavoro", "Networking at an event", "At an industry event, someone has heard about your work.", "Guest", [
        ("t", "È lei che ha curato il progetto sull'energia solare? Ne ho sentito parlare molto bene.", "Are you the one who led the solar energy project? I've heard great things."), ("y", "Sì, sono io. Mi fa piacere che ne abbia sentito parlare.", "Yes, that's me. I'm glad you heard about it."),
        ("t", "Qual è stata la sfida più grande?", "What was the biggest challenge?"), ("y", "Convincere gli investitori che ne valeva la pena a lungo termine.", "Convincing investors it was worth it in the long term."),
        ("t", "Stiamo cercando partner per qualcosa di simile al Sud.", "We're looking for partners for something similar in the south."), ("y", "Mi piacerebbe parlarne con calma. Ci scambiamo i contatti?", "I'd love to talk about it properly. Shall we swap contacts?"),
    ]),
    ("it-doctor-6", 6, "doctor", "Un secondo parere", "A second opinion", "Another doctor recommended surgery; you want a second opinion.", "Doctor", [
        ("y", "Un altro medico mi ha consigliato un intervento al ginocchio, ma vorrei un secondo parere.", "Another doctor advised knee surgery, but I'd like a second opinion."), ("t", "Ha fatto benissimo. Ha portato gli esami?", "You did the right thing. Did you bring your test results?"),
        ("y", "Sì. Vorrei sapere se esiste un'alternativa all'intervento.", "Yes. I'd like to know if there's an alternative to surgery."), ("t", "Dalla risonanza, la lesione è piccola. Possiamo provare prima con la fisioterapia.", "From the MRI, the injury is small. We can try physical therapy first."),
        ("y", "E se non migliora?", "And if it doesn't get better?"), ("t", "Allora rivalutiamo fra tre mesi. L'intervento resta un'opzione.", "Then we reassess in three months. Surgery remains an option."),
    ]),
    ("it-airport-6", 6, "airport", "Una coincidenza persa", "A missed connection", "Your first flight was three hours late and you missed your connection.", "Airline agent", [
        ("y", "Il mio primo volo è arrivato con tre ore di ritardo e ho perso la coincidenza per Palermo.", "My first flight arrived three hours late and I missed my connection to Palermo."), ("t", "Mi dispiace. Il prossimo volo con posti liberi parte domani alle sette.", "I'm sorry. The next flight with free seats leaves tomorrow at seven."),
        ("y", "Visto che il ritardo è colpa della compagnia, mi pagate l'albergo?", "Since the delay was the airline's fault, will you pay for the hotel?"), ("t", "Sì: albergo, trasporto e cena sono a carico nostro.", "Yes: hotel, transport and dinner are on us."),
        ("y", "E la mia valigia va direttamente a Palermo?", "And will my suitcase go straight to Palermo?"), ("t", "Sì, viaggia sullo stesso volo con lei.", "Yes, it'll travel on the same flight as you."),
    ]),
    ("it-dating-4", 4, "dating", "Dopo il corso di tango", "Asking someone out after class", "After tango class, the person you danced with comes over.", "Classmate", [
        ("t", "Balli benissimo! Avevi già fatto lezioni?", "You dance really well! Had you taken lessons before?"), ("y", "Macché, è la mia terza lezione. Sei tu che guidi bene.", "Not at all, it's my third lesson. You're the one who leads well."),
        ("t", "Grazie! Potremmo esercitarci uno di questi giorni.", "Thanks! We could practice one of these days."), ("y", "Mi piacerebbe. Sabato c'è una milonga in centro.", "I'd like that. There's a milonga downtown on Saturday."),
        ("t", "Affare fatto! Mi dai il tuo numero?", "Deal! Will you give me your number?"), ("y", "Certo. Mandami un messaggio e salvo il tuo.", "Sure. Send me a message and I'll save yours."),
        ("t", "Perfetto. A sabato, allora!", "Perfect. See you Saturday, then!"),
    ]),
    ("it-dating-5", 5, "dating", "Abbiamo fatto match", "Chatting after a match", "You matched on a dating app and start chatting.", "Your match", [
        ("t", "Ciao! Ho visto che anche a te piace fare trekking. Il sentiero più bello che hai fatto?", "Hi! I saw you like hiking too. What's the best trail you've done?"), ("y", "Il Sentiero degli Dei, in Costiera Amalfitana. La vista è pazzesca.", "The Path of the Gods, on the Amalfi Coast. The view is incredible."),
        ("t", "Dicono che è bellissimo! È faticoso?", "They say it's gorgeous! Is it tiring?"), ("y", "Un po', ma ogni passo ne vale la pena.", "A bit, but every step is worth it."),
        ("t", "Che coraggio! Io non l'ho ancora fatto.", "How brave! I still haven't done it."), ("y", "Se vuoi, iniziamo con un sentiero più facile.", "If you like, we can start with an easier trail."),
        ("t", "Ci sto! Che ne dici di domenica mattina?", "I'm in! How about Sunday morning?"),
    ]),
    ("it-dating-6", 6, "dating", "Il pranzo con la famiglia", "Lunch with your partner's family", "Your partner Marco has brought you to Sunday lunch with his family.", "Marco's mom", [
        ("t", "Benvenuta! Marco ci parla sempre di te.", "Welcome! Marco always talks about you."), ("y", "Grazie mille, signora. Ho portato delle paste per il dolce.", "Thank you so much, ma'am. I brought some pastries for dessert."),
        ("t", "Che pensiero gentile! Accomodati. Ti piacciono le lasagne?", "How thoughtful! Have a seat. Do you like lasagna?"), ("y", "Le adoro! E c'è un profumo meraviglioso.", "I love it! And it smells wonderful."),
        ("t", "È la ricetta di mia nonna. Mangia, mangia!", "It's my grandmother's recipe. Eat, eat!"), ("y", "Volentieri. È buonissima, lei cucina davvero bene.", "Gladly. It's delicious, you really are a great cook."),
        ("t", "Che cara! Adesso sei di famiglia.", "How sweet! Now you're one of the family."),
    ]),
    ("it-hotel-2", 2, "hotel", "Alla reception", "Checking in at the hotel", "You arrive at your hotel in Florence.", "Receptionist", [
        ("t", "Buonasera e benvenuto! Ha una prenotazione?", "Good evening and welcome! Do you have a reservation?"), ("y", "Sì, a nome Smith.", "Yes, under the name Smith."),
        ("t", "Trovata. Sono tre notti, giusto?", "Found it. Three nights, right?"), ("y", "Giusto. La colazione è inclusa?", "That's right. Is breakfast included?"),
        ("t", "Sì, dalle sette alle dieci.", "Yes, from seven to ten."), ("y", "Ottimo. Qual è la password del wi-fi?", "Great. What's the wi-fi password?"),
        ("t", "È scritta qui sulla chiave. La sua camera è la 304.", "It's written here on the key card. Your room is 304."),
    ]),
    ("it-hotel-3", 3, "hotel", "Un problema in camera", "A problem with the room", "The air conditioning in your room isn't working, so you call the front desk.", "Receptionist", [
        ("t", "Reception, buonasera.", "Front desk, good evening."), ("y", "Buonasera. L'aria condizionata della camera 304 non funziona.", "Good evening. The air conditioning in room 304 isn't working."),
        ("t", "Mi dispiace. Ha provato con il telecomando?", "I'm sorry. Have you tried the remote?"), ("y", "Sì, ma non si accende.", "Yes, but it won't turn on."),
        ("t", "Le mando subito qualcuno della manutenzione.", "I'll send someone from maintenance right away."), ("y", "Grazie. Se non si può riparare, posso cambiare camera?", "Thanks. If it can't be fixed, can I change rooms?"),
        ("t", "Certo, nessun problema.", "Of course, no problem."),
    ]),
    ("it-hotel-4", 4, "hotel", "Restare qualche giorno in più", "Extending your stay", "You'd like two more nights and a late checkout.", "Receptionist", [
        ("y", "Buongiorno. Vorrei restare altre due notti. C'è disponibilità?", "Good morning. I'd like to stay two more nights. Is there availability?"), ("t", "Vediamo… Sì, ma nella stessa camera solo fino a domani.", "Let's see… Yes, but in the same room only until tomorrow."),
        ("y", "Va bene cambiare camera. Il prezzo è lo stesso?", "Changing rooms is fine. Is the price the same?"), ("t", "Venerdì costa un po' di più, per via del weekend.", "Friday costs a bit more, because of the weekend."),
        ("y", "D'accordo. Sarebbe possibile fare il check-out più tardi l'ultimo giorno?", "OK. Would it be possible to check out later on the last day?"), ("t", "Fino alle due del pomeriggio, senza costi aggiuntivi.", "Until two in the afternoon, at no extra cost."),
        ("y", "Perfetto, grazie mille.", "Perfect, thanks a lot."),
    ]),
    ("it-job-4", 4, "job", "Il colloquio di lavoro", "A job interview", "You're interviewing for a job as a sales assistant at a bookshop.", "Interviewer", [
        ("t", "Grazie di essere venuto. Mi parli un po' di lei.", "Thanks for coming. Tell me a bit about yourself."), ("y", "Sono laureato in Lettere e amo i libri da quando ero bambino.", "I have a degree in literature and I've loved books since I was a child."),
        ("t", "Ha già lavorato nelle vendite?", "Have you worked in sales before?"), ("y", "Ho lavorato due anni in un negozio di abbigliamento, a contatto con i clienti.", "I worked for two years in a clothes shop, dealing with customers."),
        ("t", "Come gestisce un cliente difficile?", "How do you handle a difficult customer?"), ("y", "Ascolto con calma e cerco una soluzione insieme a lui.", "I listen calmly and look for a solution together with them."),
        ("t", "Molto bene. È disponibile il sabato?", "Very good. Are you available on Saturdays?"),
    ]),
    ("it-job-5", 5, "job", "I tuoi punti di forza", "Your strengths", "A second interview for a marketing job.", "Hiring manager", [
        ("t", "Quali direbbe che sono i suoi punti di forza?", "What would you say your strengths are?"), ("y", "Sono creativa e molto organizzata con le scadenze.", "I'm creative and very organized with deadlines."),
        ("t", "E un aspetto da migliorare?", "And something to improve?"), ("y", "A volte faccio fatica a delegare, ma ci sto lavorando.", "Sometimes I struggle to delegate, but I'm working on it."),
        ("t", "Mi faccia l'esempio di una campagna riuscita.", "Give me an example of a successful campaign."), ("y", "Ho lanciato una campagna sui social che ha raddoppiato le vendite in tre mesi.", "I launched a social media campaign that doubled sales in three months."),
        ("t", "Notevole. Perché vuole lasciare l'azienda attuale?", "Impressive. Why do you want to leave your current company?"),
    ]),
    ("it-job-6", 6, "job", "Negoziare lo stipendio", "Negotiating your salary", "You've been offered the job; now you talk about pay.", "Hiring manager", [
        ("t", "La vogliamo nel team. L'offerta è di trentacinquemila euro lordi all'anno.", "We want you on the team. The offer is thirty-five thousand euros gross a year."),
        ("y", "Sono molto contento dell'offerta. Però, vista la mia esperienza, mi aspettavo intorno ai quarantamila.", "I'm very pleased with the offer. But given my experience, I was expecting around forty thousand."),
        ("t", "Quarantamila è oltre il nostro budget per questo ruolo.", "Forty thousand is beyond our budget for this role."), ("y", "Capisco. Sarebbe possibile arrivare a trentottomila, con una revisione fra sei mesi?", "I understand. Would it be possible to reach thirty-eight thousand, with a review in six months?"),
        ("t", "Posso presentare la proposta alla direzione.", "I can put the proposal to management."), ("y", "E per lo smart working, come funziona?", "And how does remote working work?"),
        ("t", "Due giorni a settimana da casa, con orario flessibile.", "Two days a week from home, with flexible hours."),
    ]),
    ("it-flirting-4", 4, "flirting", "In libreria", "A compliment in a bookshop", "In a bookshop, someone is browsing the same shelf as you.", "Stranger", [
        ("y", "Scusa, l'hai letto questo? Sono indeciso.", "Sorry, have you read this one? I can't decide."), ("t", "Sì! È bellissimo, ma il finale ti lascia senza parole.", "Yes! It's beautiful, but the ending leaves you speechless."),
        ("y", "Allora lo prendo. Si vede che hai buon gusto.", "Then I'll take it. You can tell you have good taste."), ("t", "Ah! Grazie. E tu cosa leggi di solito?", "Ha! Thanks. And what do you usually read?"),
        ("y", "Tanta fantascienza. Me ne consigli un altro?", "Lots of sci-fi. Can you recommend another?"), ("t", "Va bene, ma solo se poi mi dici cosa ne pensi di questo.", "OK, but only if you tell me what you think of this one afterwards."),
    ]),
    ("it-flirting-5", 5, "flirting", "Serata quiz", "Teasing after trivia night", "Your team just lost trivia night to the team at the next table, by one point.", "Rival player", [
        ("t", "Per un punto! Peccato, eh?", "By one point! Too bad, huh?"), ("y", "Avete avuto fortuna, ammettilo.", "You got lucky, admit it."),
        ("t", "Fortuna? Abbiamo indovinato la domanda di geografia che voi avete sbagliato.", "Luck? We got the geography question you missed."), ("y", "Va bene, questa ve la concedo. Ma la settimana prossima c'è la rivincita.", "OK, I'll give you that one. But next week there's a rematch."),
        ("t", "Affare fatto. E chi perde offre da bere.", "Deal. And whoever loses buys the drinks."), ("y", "Ci sto. Comincia pure a mettere da parte i soldi.", "You're on. You can start putting money aside now."),
        ("t", "Sicuro di te, eh? Mi piace.", "Sure of yourself, huh? I like that."),
    ]),
    ("it-flirting-6", 6, "flirting", "Un buon inizio sull'app", "From opener to plan", "You matched on an app. You open the conversation.", "Your match", [
        ("y", "Ciao! Devo sapere: quella foto sulle Dolomiti è prima o dopo la salita?", "Hi! I have to know: is that Dolomites photo before or after the climb?"), ("t", "Ahah, dopo! Per questo ho la faccia stanca.", "Haha, after! That's why I look tired."),
        ("y", "Stanca, ma con la vista più bella d'Italia. Ne è valsa la pena?", "Tired, but with the best view in Italy. Was it worth it?"), ("t", "Ogni goccia di sudore. E tu, ti piace viaggiare?", "Every drop of sweat. And you, do you like traveling?"),
        ("y", "Tantissimo. L'anno prossimo vorrei fare il giro della Sicilia.", "So much. Next year I'd like to travel around Sicily."), ("t", "È il mio sogno! Me ne racconti davanti a un caffè?", "That's my dream! Will you tell me about it over coffee?"),
        ("y", "Affare fatto. Giovedì dopo il lavoro ti va bene?", "Deal. Does Thursday after work suit you?"),
    ]),
]
