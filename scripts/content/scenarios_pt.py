"""Brazilian Portuguese role-plays. Lines: ("t", text, en) is them, ("y", text, en) is you."""

SCENARIOS = [
    ("pt-food-1", 1, "food", "Na lanchonete", "At the snack bar", "You're at a snack bar in São Paulo. The waiter comes over.", "Waiter", [
        ("t", "Bom dia! O que vai querer?", "Good morning! What would you like?"), ("y", "Um café com leite, por favor.", "A coffee with milk, please."),
        ("t", "Vai comer alguma coisa?", "Anything to eat?"), ("y", "Sim, um pão de queijo.", "Yes, a cheese bread."),
        ("t", "Certo. São doze reais.", "OK. That's twelve reais."), ("y", "Aqui está. Obrigado.", "Here you go. Thanks."), ("t", "Obrigado! Bom dia para você.", "Thank you! Have a good day."),
    ]),
    ("pt-directions-1", 1, "directions", "Onde fica o banco?", "Where's the bank?", "You're downtown and need a bank.", "Passer-by", [
        ("y", "Com licença, onde fica o banco?", "Excuse me, where's the bank?"), ("t", "Fica ali, na esquina.", "It's over there, on the corner."),
        ("y", "É perto?", "Is it close?"), ("t", "Sim, muito perto. Dois minutos.", "Yes, very close. Two minutes."),
        ("y", "Muito obrigado!", "Thank you very much!"), ("t", "De nada!", "You're welcome!"),
    ]),
    ("pt-shopping-1", 1, "shopping", "Na feira", "At the street market", "You're buying fruit at a market stall.", "Stallholder", [
        ("t", "Bom dia, freguesa! O que vai ser?", "Good morning! What will it be?"), ("y", "Quanto custa a manga?", "How much are the mangoes?"),
        ("t", "Três por dez reais.", "Three for ten reais."), ("y", "Vou levar três, por favor.", "I'll take three, please."),
        ("t", "Mais alguma coisa?", "Anything else?"), ("y", "Não, só isso. Obrigada.", "No, that's all. Thanks."),
    ]),
    ("pt-smalltalk-2", 2, "smalltalk", "Conhecendo alguém", "Meeting someone new", "At a friend's party, someone comes up to say hi.", "Rodrigo", [
        ("t", "Oi! Tudo bem? Eu sou o Rodrigo.", "Hi! How's it going? I'm Rodrigo."), ("y", "Oi, Rodrigo! Tudo bem. Eu sou a Emma.", "Hi, Rodrigo! All good. I'm Emma.", ["Oi, tudo bem. Eu sou a Emma."]),
        ("t", "Prazer, Emma! De onde você é?", "Nice to meet you, Emma! Where are you from?"), ("y", "Sou do Canadá.", "I'm from Canada."),
        ("t", "Que legal! Você mora aqui no Rio?", "How cool! Do you live here in Rio?"), ("y", "Sim, moro aqui há seis meses.", "Yes, I've lived here for six months."),
        ("t", "Bem-vinda! Se precisar de alguma coisa, é só falar.", "Welcome! If you need anything, just say so."),
    ]),
    ("pt-doctor-2", 2, "doctor", "No consultório", "At the doctor's", "You're not feeling well and see a doctor.", "Doctor", [
        ("t", "Boa tarde. O que você está sentindo?", "Good afternoon. How are you feeling?"), ("y", "Estou com dor de cabeça e febre.", "I have a headache and a fever."),
        ("t", "Desde quando?", "Since when?"), ("y", "Desde ontem.", "Since yesterday."),
        ("t", "Tome este remédio e descanse bastante.", "Take this medicine and get plenty of rest."), ("y", "Obrigada, doutora.", "Thank you, doctor."),
    ]),
    ("pt-airport-2", 2, "airport", "No check-in", "At the check-in desk", "You're checking in for your flight.", "Agent", [
        ("t", "Bom dia. Seu passaporte, por favor.", "Good morning. Your passport, please."), ("y", "Aqui está.", "Here it is."),
        ("t", "Vai despachar alguma mala?", "Are you checking any bags?"), ("y", "Sim, uma mala.", "Yes, one suitcase."),
        ("t", "Prefere janela ou corredor?", "Window or aisle?"), ("y", "Janela, por favor.", "Window, please."), ("t", "Pronto. O embarque é às dez, no portão cinco.", "All set. Boarding is at ten, at gate five."),
    ]),
    ("pt-food-3", 3, "food", "Um erro no pedido", "The wrong dish", "The waiter brought you the wrong dish.", "Waiter", [
        ("y", "Com licença, eu pedi o peixe, mas veio frango.", "Excuse me, I ordered the fish, but I got chicken.", ["Com licença, pedi o peixe, mas veio frango."]),
        ("t", "Nossa, desculpa! Vou trocar agora mesmo.", "Oh, sorry! I'll change it right away."), ("y", "Obrigado. Demora muito?", "Thanks. Will it take long?"),
        ("t", "Uns dez minutos. Quer uma bebida enquanto isso?", "About ten minutes. Would you like a drink meanwhile?"), ("y", "Sim, um suco de laranja, por favor.", "Yes, an orange juice, please."),
        ("t", "O suco é por conta da casa.", "The juice is on the house."),
    ]),
    ("pt-shopping-3", 3, "shopping", "Trocar uma camisa", "Exchanging a shirt", "You bought a shirt that's too small.", "Shop assistant", [
        ("y", "Oi, comprei esta camisa ontem, mas ficou pequena.", "Hi, I bought this shirt yesterday, but it's too small."), ("t", "Sem problema. Você está com a nota fiscal?", "No problem. Do you have the receipt?"),
        ("y", "Estou, aqui está.", "Yes, here it is."), ("t", "Quer trocar por um tamanho maior?", "Would you like to exchange it for a bigger size?"),
        ("y", "Quero, um tamanho M, por favor.", "Yes, a medium, please."), ("t", "Aqui está. Quer experimentar?", "Here you go. Would you like to try it on?"),
    ]),
    ("pt-directions-3", 3, "directions", "Como chego ao museu?", "Getting to the museum", "You want to visit the Museum of Tomorrow by public transport.", "Local", [
        ("y", "Com licença, como eu chego ao Museu do Amanhã?", "Excuse me, how do I get to the Museum of Tomorrow?"), ("t", "Você pode pegar o VLT aqui na esquina.", "You can take the tram here on the corner."),
        ("y", "Em qual parada eu desço?", "Which stop do I get off at?"), ("t", "Na Praça Mauá. São umas quatro paradas.", "At Praça Mauá. It's about four stops."),
        ("y", "E preciso de bilhete?", "And do I need a ticket?"), ("t", "Não, é só passar o cartão do transporte.", "No, you just tap your transport card."),
    ]),
    ("pt-doctor-4", 4, "doctor", "Explicando os sintomas", "Explaining your symptoms", "You've had stomach trouble for a few days.", "Doctor", [
        ("t", "Então, me conta o que está acontecendo.", "So, tell me what's going on."), ("y", "Faz três dias que estou com dor de barriga.", "I've had a stomachache for three days."),
        ("t", "Você comeu alguma coisa diferente?", "Did you eat anything unusual?"), ("y", "Comi frutos do mar numa barraca de praia.", "I ate seafood at a beach stall."),
        ("t", "Tem febre ou enjoo?", "Any fever or nausea?"), ("y", "Um pouco de enjoo de manhã, mas sem febre.", "A bit of nausea in the morning, but no fever."),
        ("t", "Vou pedir um exame de sangue, por precaução.", "I'll order a blood test, as a precaution."),
    ]),
    ("pt-airport-4", 4, "airport", "Bagagem extraviada", "Lost luggage", "Your suitcase didn't come out at baggage claim.", "Airline agent", [
        ("y", "Boa noite. Minha mala não apareceu na esteira.", "Good evening. My suitcase didn't come out on the belt."), ("t", "Sinto muito. Pode me mostrar o comprovante da bagagem?", "I'm sorry. Can you show me the baggage tag?"),
        ("y", "Claro. É uma mala azul, grande, com rodinhas.", "Sure. It's a big blue suitcase with wheels."), ("t", "Ela ficou em Lisboa. Chega amanhã no primeiro voo.", "It stayed in Lisbon. It'll arrive tomorrow on the first flight."),
        ("y", "Vocês podem entregar no meu hotel?", "Can you deliver it to my hotel?"), ("t", "Podemos sim. Só preciso do endereço e de um telefone.", "Yes, we can. I just need the address and a phone number."),
    ]),
    ("pt-smalltalk-4", 4, "smalltalk", "E o fim de semana?", "How was your weekend?", "Monday morning, a coworker asks about your weekend.", "Coworker", [
        ("t", "E aí, como foi o fim de semana?", "So, how was your weekend?"), ("y", "Foi ótimo! Fui para a praia com uns amigos.", "It was great! I went to the beach with some friends."),
        ("t", "Que inveja! Qual praia?", "I'm jealous! Which beach?"), ("y", "Ubatuba. A água estava uma delícia.", "Ubatuba. The water was lovely."),
        ("t", "Eu fiquei em casa maratonando uma série.", "I stayed home binge-watching a series."), ("y", "Também é um bom programa. Qual série?", "That's a good plan too. Which series?"),
    ]),
    ("pt-food-5", 5, "food", "Reserva para um grupo", "Booking for a group", "You're organizing a work dinner for twelve.", "Restaurant manager", [
        ("y", "Boa tarde, eu queria reservar uma mesa para doze pessoas na sexta.", "Good afternoon, I'd like to book a table for twelve on Friday."), ("t", "Para que horas?", "For what time?"),
        ("y", "Às oito, se possível. Vocês têm um espaço mais reservado?", "At eight, if possible. Do you have a more private area?"), ("t", "Temos uma sala no andar de cima. Para grupos, trabalhamos com menu fechado.", "We have a room upstairs. For groups, we have a set menu."),
        ("y", "Perfeito. Tem opção vegetariana?", "Perfect. Is there a vegetarian option?"), ("t", "Tem sim. Vou te mandar o cardápio por e-mail.", "Yes, there is. I'll email you the menu."),
    ]),
    ("pt-shopping-5", 5, "shopping", "Acionar a garantia", "A warranty claim", "Your two-month-old laptop has stopped charging.", "Store clerk", [
        ("y", "Comprei este notebook há dois meses e ele parou de carregar.", "I bought this laptop two months ago and it's stopped charging."), ("t", "Você já testou com outro carregador?", "Have you tried another charger?"),
        ("y", "Já, e o problema continua. Ainda está na garantia, né?", "Yes, and it's still not working. It's still under warranty, right?"), ("t", "Está, sim. Vamos mandar para a assistência técnica.", "Yes, it is. We'll send it to technical support."),
        ("y", "Quanto tempo demora? Eu preciso dele para trabalhar.", "How long will it take? I need it for work."), ("t", "Até quinze dias úteis. Se não tiver conserto, a gente troca.", "Up to fifteen working days. If it can't be fixed, we'll replace it."),
    ]),
    ("pt-directions-5", 5, "directions", "Dia de greve", "A transport strike", "A visitor asks you how to get to the airport during a strike.", "Visitor", [
        ("t", "Com licença, o metrô está fechado? Preciso ir para o aeroporto.", "Excuse me, is the subway closed? I need to get to the airport."), ("y", "Hoje tem greve. O metrô não está funcionando.", "There's a strike today. The subway isn't running."),
        ("t", "Nossa! E agora, como eu faço?", "Oh no! So what do I do now?"), ("y", "O melhor é pedir um carro por aplicativo, mas saia com antecedência.", "Best to get a ride-hailing car, but leave early."),
        ("t", "O trânsito deve estar horrível.", "The traffic must be terrible."), ("y", "Deve, sim. Calcule pelo menos uma hora e meia.", "It must be. Allow at least an hour and a half."),
    ]),
    ("pt-smalltalk-6", 6, "smalltalk", "Num evento de trabalho", "Networking at an event", "At an industry event, someone has heard about your work.", "Guest", [
        ("t", "Você é quem fez aquele projeto de energia solar? Ouvi falar muito bem.", "Are you the one behind that solar energy project? I've heard great things."), ("y", "Sou eu, sim. Fico feliz que tenha chegado até você.", "That's me. I'm glad it reached you."),
        ("t", "Qual foi o maior desafio?", "What was the biggest challenge?"), ("y", "Convencer os investidores de que valia a pena no longo prazo.", "Convincing investors it was worth it in the long run."),
        ("t", "Estamos buscando parceiros para algo parecido no Nordeste.", "We're looking for partners for something similar in the northeast."), ("y", "Adoraria conversar com calma. Vamos trocar contatos?", "I'd love to talk properly. Shall we swap contacts?"),
    ]),
    ("pt-doctor-6", 6, "doctor", "Uma segunda opinião", "A second opinion", "Another doctor recommended surgery; you want a second opinion.", "Doctor", [
        ("y", "Outro médico me recomendou cirurgia no joelho, mas eu queria uma segunda opinião.", "Another doctor recommended knee surgery, but I'd like a second opinion."), ("t", "Fez muito bem. Trouxe os exames?", "Very wise. Did you bring your test results?"),
        ("y", "Trouxe. Queria saber se existe alguma alternativa à cirurgia.", "I did. I'd like to know if there's any alternative to surgery."), ("t", "Pela ressonância, a lesão é pequena. Podemos tentar fisioterapia primeiro.", "Judging by the MRI, the injury is small. We could try physical therapy first."),
        ("y", "E se não melhorar?", "And if it doesn't get better?"), ("t", "Aí reavaliamos em três meses. A cirurgia continua sendo uma opção.", "Then we reassess in three months. Surgery is still an option."),
    ]),
    ("pt-airport-6", 6, "airport", "Perdi a conexão", "A missed connection", "Your first flight was three hours late and you missed your connection.", "Airline agent", [
        ("y", "Meu primeiro voo atrasou três horas e eu perdi a conexão para Manaus.", "My first flight was three hours late and I missed my connection to Manaus."), ("t", "Sinto muito. O próximo voo com assento disponível sai amanhã às sete.", "I'm sorry. The next flight with a seat leaves tomorrow at seven."),
        ("y", "Como o atraso foi da companhia, vocês cobrem o hotel?", "Since the delay was the airline's fault, do you cover the hotel?"), ("t", "Cobrimos, sim: hotel, transporte e jantar.", "Yes, we do: hotel, transport and dinner."),
        ("y", "E a minha mala, vai direto para Manaus?", "And my suitcase, will it go straight to Manaus?"), ("t", "Vai, sim. Ela segue no mesmo voo que você.", "Yes. It goes on the same flight as you."),
    ]),
    ("pt-dating-4", 4, "dating", "Depois da aula de forró", "Asking someone out after class", "After forró class, the person you danced with comes over.", "Classmate", [
        ("t", "Você dança muito bem! Já fazia aula antes?", "You dance really well! Had you taken classes before?"), ("y", "Que nada, é a minha terceira aula. Você que conduziu bem.", "Not at all, it's my third class. You led well."),
        ("t", "Obrigado! A gente podia praticar mais qualquer dia.", "Thanks! We could practice more some day."), ("y", "Adoraria. Tem um bar com forró ao vivo no sábado.", "I'd love to. There's a bar with live forró on Saturday."),
        ("t", "Combinado! Me passa o seu número?", "Deal! Will you give me your number?"), ("y", "Claro. Me manda uma mensagem que eu salvo o seu.", "Sure. Send me a message and I'll save yours."),
        ("t", "Fechado. Até sábado, então!", "Done. See you Saturday, then!"),
    ]),
    ("pt-dating-5", 5, "dating", "Deu match", "Chatting after a match", "You matched on a dating app and start chatting.", "Your match", [
        ("t", "Oi! Vi que você também curte trilha. Qual foi a melhor que você já fez?", "Hi! I saw you're into hiking too. What's the best trail you've done?"), ("y", "A Pedra da Gávea, no Rio. A vista lá de cima é surreal.", "Pedra da Gávea, in Rio. The view from the top is unreal."),
        ("t", "Dizem que é bem puxada! Você sentiu medo?", "They say it's pretty tough! Were you scared?"), ("y", "Um pouco na parte da escalada, mas valeu cada passo.", "A bit on the climbing part, but it was worth every step."),
        ("t", "Que corajosa! Eu ainda não tive coragem.", "How brave! I still haven't had the courage."), ("y", "Se quiser, a gente faz uma trilha mais tranquila primeiro.", "If you like, we can do an easier trail first."),
        ("t", "Topo! Que tal domingo de manhã?", "I'm in! How about Sunday morning?"),
    ]),
    ("pt-dating-6", 6, "dating", "Almoço com a família", "Lunch with your partner's family", "Your partner Pedro has brought you to Sunday lunch with his family.", "Pedro's mom", [
        ("t", "Seja bem-vinda! O Pedro fala tanto de você.", "Welcome! Pedro talks about you so much."), ("y", "Muito obrigada, dona Lúcia. Trouxe um pudim para a sobremesa.", "Thank you so much, Mrs. Lúcia. I brought a flan for dessert."),
        ("t", "Que gentileza! Fica à vontade. Você gosta de feijoada?", "How kind! Make yourself at home. Do you like feijoada?"), ("y", "Adoro! E o cheiro está maravilhoso.", "I love it! And it smells wonderful."),
        ("t", "É receita da minha mãe. Coma bastante, viu?", "It's my mother's recipe. Eat plenty, OK?"), ("y", "Pode deixar. Está uma delícia, a senhora cozinha muito bem.", "Don't worry, I will. It's delicious, you're a great cook."),
        ("t", "Ah, que bom que gostou! Agora você já é de casa.", "Oh, I'm so glad you like it! Now you're one of the family."),
    ]),
    ("pt-hotel-2", 2, "hotel", "Na recepção", "Checking in at the hotel", "You arrive at your hotel in Salvador.", "Receptionist", [
        ("t", "Boa tarde! Bem-vindo ao hotel. Tem reserva?", "Good afternoon! Welcome to the hotel. Do you have a reservation?"), ("y", "Tenho, sim. Em nome de Smith.", "Yes, I do. Under the name Smith."),
        ("t", "Encontrei. São três noites, certo?", "Found it. Three nights, right?"), ("y", "Isso. O café da manhã está incluído?", "That's right. Is breakfast included?"),
        ("t", "Está, sim. É servido das seis às dez.", "Yes, it is. It's served from six to ten."), ("y", "Ótimo. E qual é a senha do wi-fi?", "Great. And what's the wi-fi password?"),
        ("t", "Está aqui no cartão. Seu quarto é o 304.", "It's here on the card. Your room is 304."),
    ]),
    ("pt-hotel-3", 3, "hotel", "Um problema no quarto", "A problem with the room", "The air conditioning in your room isn't working, so you call the front desk.", "Receptionist", [
        ("t", "Recepção, boa noite.", "Front desk, good evening."), ("y", "Boa noite. O ar-condicionado do quarto 304 não está funcionando.", "Good evening. The air conditioning in room 304 isn't working."),
        ("t", "Sinto muito. Já tentou ligar pelo controle?", "I'm sorry. Have you tried turning it on with the remote?"), ("y", "Já, mas ele não liga.", "Yes, but it won't turn on."),
        ("t", "Vou mandar alguém da manutenção agora.", "I'll send someone from maintenance right away."), ("y", "Obrigado. Se não der para consertar, posso trocar de quarto?", "Thanks. If it can't be fixed, can I change rooms?"),
        ("t", "Claro, sem problema nenhum.", "Of course, no problem at all."),
    ]),
    ("pt-hotel-4", 4, "hotel", "Ficar mais uns dias", "Extending your stay", "You'd like two more nights and a late checkout.", "Receptionist", [
        ("y", "Bom dia. Eu queria ficar mais duas noites. Tem disponibilidade?", "Good morning. I'd like to stay two more nights. Is there availability?"), ("t", "Deixa eu ver… Temos, mas no mesmo quarto só até amanhã.", "Let me see… We do, but in the same room only until tomorrow."),
        ("y", "Não tem problema mudar de quarto. O preço é o mesmo?", "Changing rooms is fine. Is the price the same?"), ("t", "Na sexta é um pouco mais caro, por causa do fim de semana.", "Friday is a little more expensive, because of the weekend."),
        ("y", "Tudo bem. E seria possível fazer o checkout mais tarde no último dia?", "That's fine. And would it be possible to check out later on the last day?"), ("t", "Até as duas da tarde, sem custo extra.", "Until two in the afternoon, at no extra cost."),
        ("y", "Perfeito, muito obrigado.", "Perfect, thank you very much."),
    ]),
    ("pt-job-4", 4, "job", "Entrevista de emprego", "A job interview", "You're interviewing for a job as a sales assistant at a bookshop.", "Interviewer", [
        ("t", "Obrigada por vir. Me fala um pouco sobre você.", "Thanks for coming. Tell me a bit about yourself."), ("y", "Eu sou formado em Letras e adoro livros desde criança.", "I have a degree in literature and I've loved books since I was a kid."),
        ("t", "Já trabalhou com vendas?", "Have you worked in sales before?"), ("y", "Trabalhei dois anos numa loja de roupas, atendendo clientes.", "I worked for two years in a clothes shop, serving customers."),
        ("t", "Como você lida com um cliente difícil?", "How do you deal with a difficult customer?"), ("y", "Eu escuto com calma e procuro uma solução junto com ele.", "I listen calmly and look for a solution together with them."),
        ("t", "Ótimo. Você tem disponibilidade aos sábados?", "Great. Are you available on Saturdays?"),
    ]),
    ("pt-job-5", 5, "job", "Seus pontos fortes", "Your strengths", "A second interview for a marketing job.", "Hiring manager", [
        ("t", "Quais você diria que são os seus pontos fortes?", "What would you say your strengths are?"), ("y", "Sou criativo e muito organizado com prazos.", "I'm creative and very organized with deadlines."),
        ("t", "E um ponto que você quer melhorar?", "And something you'd like to improve?"), ("y", "Às vezes tenho dificuldade em delegar, mas estou trabalhando nisso.", "Sometimes I find it hard to delegate, but I'm working on it."),
        ("t", "Me dá um exemplo de uma campanha que deu certo.", "Give me an example of a campaign that worked."), ("y", "Lancei uma campanha nas redes que dobrou as vendas em três meses.", "I launched a social media campaign that doubled sales in three months."),
        ("t", "Impressionante. Por que você quer sair da empresa atual?", "Impressive. Why do you want to leave your current company?"),
    ]),
    ("pt-job-6", 6, "job", "Negociando o salário", "Negotiating your salary", "You've been offered the job; now you talk about pay.", "Hiring manager", [
        ("t", "Queremos você na equipe. A proposta é de oito mil por mês.", "We want you on the team. The offer is eight thousand a month."), ("y", "Fico muito feliz com a proposta. Mas, pela minha experiência, eu esperava algo em torno de dez mil.", "I'm very happy with the offer. But given my experience, I was expecting something around ten thousand."),
        ("t", "Dez mil está acima do nosso orçamento para o cargo.", "Ten thousand is above our budget for the role."), ("y", "Entendo. Seria possível chegar a nove mil, com revisão em seis meses?", "I understand. Would it be possible to reach nine thousand, with a review in six months?"),
        ("t", "Posso levar essa proposta para a diretoria.", "I can take that proposal to the board."), ("y", "E o trabalho remoto, como funciona?", "And how does remote work work?"),
        ("t", "Dois dias de casa por semana, com horário flexível.", "Two days a week from home, with flexible hours."),
    ]),
    ("pt-flirting-4", 4, "flirting", "Na livraria", "A compliment in a bookshop", "In a bookshop, someone is browsing the same shelf as you.", "Stranger", [
        ("y", "Desculpa, você já leu esse? Estou em dúvida.", "Sorry, have you read that one? I can't decide."), ("t", "Li, sim! É incrível, mas o final te deixa sem chão.", "I have! It's amazing, but the ending leaves you speechless."),
        ("y", "Então vou levar. Você tem bom gosto, dá para ver.", "Then I'll take it. You have good taste, I can tell."), ("t", "Ha! Obrigada. E você, o que costuma ler?", "Ha! Thanks. And what do you usually read?"),
        ("y", "Muita ficção científica. Me recomenda mais algum?", "Lots of sci-fi. Can you recommend another?"), ("t", "Recomendo, mas só se você me contar o que achou deste depois.", "I can, but only if you tell me what you thought of this one afterwards."),
    ]),
    ("pt-flirting-5", 5, "flirting", "Noite de quiz", "Teasing after trivia night", "Your team just lost trivia night to the team at the next table, by one point.", "Rival player", [
        ("t", "Por um ponto! Quase, hein?", "By one point! So close, huh?"), ("y", "Foi sorte de vocês, admite.", "You just got lucky, admit it."),
        ("t", "Sorte? A gente acertou a pergunta de geografia que vocês erraram.", "Luck? We got the geography question you missed."), ("y", "Tá bom, essa foi boa. Mas na semana que vem tem revanche.", "OK, that was a good one. But next week there's a rematch."),
        ("t", "Combinado. E quem perder paga a rodada.", "Deal. And whoever loses buys the round."), ("y", "Fechado. Já pode ir separando o dinheiro.", "You're on. You might as well start setting the money aside."),
        ("t", "Convencido, hein? Gostei.", "Pretty sure of yourself, huh? I like that."),
    ]),
    ("pt-flirting-6", 6, "flirting", "Um bom começo no app", "From opener to plan", "You matched on an app. You open the conversation.", "Your match", [
        ("y", "Oi! Preciso saber: aquela foto na Chapada Diamantina foi antes ou depois de subir o morro?", "Hi! I need to know: was that Chapada Diamantina photo before or after the climb?"), ("t", "Haha, depois! Por isso a cara de cansaço.", "Haha, after! That's why I look so tired."),
        ("y", "Cansada, mas com a melhor vista do Brasil. Valeu a pena?", "Tired, but with the best view in Brazil. Was it worth it?"), ("t", "Cada gota de suor. E você, curte viajar?", "Every drop of sweat. And you, do you like traveling?"),
        ("y", "Muito. Estou planejando ir para o Jalapão no ano que vem.", "A lot. I'm planning to go to Jalapão next year."), ("t", "Sonho em conhecer! Me conta mais num café?", "I dream of going there! Tell me more over coffee?"),
        ("y", "Fechado. Quinta, depois do trabalho, está bom para você?", "Deal. Is Thursday after work good for you?"),
    ]),
]
