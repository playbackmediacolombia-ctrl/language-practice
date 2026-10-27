"""Brazilian Portuguese course (São Paulo and Rio), in the same outline as the other languages.
Run scripts/content/build.py to write shared/course/pt.json."""

S = {"kind": "sound"}

UNITS = [
    ("u1", "The sounds of Portuguese", [
        ("Open and closed vowels", [
            ("a", "“ah”, as in father", S), ("é", "open “eh”, as in bed", {**S, "id": "e-open"}), ("ê", "closed “ay”, as in they (short)", {**S, "id": "e-closed"}),
            ("ó", "open “aw”, as in law", {**S, "id": "o-open"}), ("ô", "closed “oh”, as in go (short)", {**S, "id": "o-closed"}),
        ]),
        ("Nasal sounds", [
            ("ão", "“owng”, through the nose", {**S, "id": "ao-nasal"}), ("ã", "“uhng”, through the nose", {**S, "id": "a-nasal"}), ("im", "“eeng”, through the nose", {**S, "id": "im-nasal"}),
            ("mãe", "mom"), ("pão", "bread"), ("sim", "yes"),
        ]),
        ("Pa, ta and the stress", [
            ("papai", "dad"), ("pato", "duck"), ("chá", "tea"), ("café", "coffee"), ("tomate", "tomato"),
        ]),
        ("Lh, nh and the R", [
            ("filho", "son"), ("manhã", "morning"), ("vinho", "wine"), ("carro", "car"), ("caro", "expensive"), ("rato", "mouse"),
        ]),
    ]),
    ("u2", "First words", [
        ("Hello and goodbye", [
            ("oi", "hi"), ("tchau", "bye"), ("olá", "hello (a bit more formal)"), ("não", "no"), ("Oi, mãe.", "Hi, mom."), ("Tchau, papai.", "Bye, dad."),
        ]),
        ("Please and thank you", [
            ("obrigado", "thank you (said by a man)"), ("por favor", "please"), ("água", "water"),
            ("Sim, obrigada.", "Yes, thank you. (said by a woman)"), ("Não, obrigado.", "No, thank you. (said by a man)"), ("Água, por favor.", "Water, please."),
        ]),
        ("Food and drink", [
            ("leite", "milk"), ("suco", "juice"), ("maçã", "apple"), ("Quero leite.", "I want milk."), ("Quero pão.", "I want bread."), ("Mais água.", "More water."),
        ]),
        ("Animals and home", [
            ("gato", "cat"), ("casa", "house"), ("o cachorro", "the dog"), ("o gato", "the cat"), ("minha casa", "my house"), ("minha mãe", "my mom"),
        ]),
    ]),
    ("u3", "Family and home", [
        ("My family", [
            ("irmão", "brother"), ("irmã", "sister"), ("avó", "grandma"), ("avô", "grandpa", {"id": "avo-grandpa"}), ("É meu irmão.", "He's my brother."), ("Eu tenho uma irmã.", "I have a sister."),
        ]),
        ("At home", [
            ("cozinha", "kitchen"), ("quarto", "bedroom"), ("cama", "bed"), ("porta", "door"), ("Meu quarto é grande.", "My bedroom is big."), ("A casa é pequena.", "The house is small."),
        ]),
        ("Eat and sleep", [
            ("comer", "to eat"), ("dormir", "to sleep"), ("Estou com fome.", "I'm hungry."), ("Estou com sono.", "I'm sleepy."), ("Boa noite.", "Good night."), ("Vamos comer.", "Let's eat."),
        ]),
    ]),
    ("u4", "I want, I have, I like", [
        ("I want to…", [
            ("brincar", "to play"), ("Quero brincar.", "I want to play."), ("Quero dormir.", "I want to sleep."), ("Você quer água?", "Do you want water?"),
            ("Não quero.", "I don't want to."), ("Quero ir para casa.", "I want to go home."),
        ]),
        ("I have", [
            ("bola", "ball"), ("livro", "book"), ("Tenho um livro.", "I have a book."), ("Você tem um lápis?", "Do you have a pencil?"),
            ("Não tenho irmãos.", "I don't have any brothers or sisters."), ("Ela tem um cachorro.", "She has a dog."),
        ]),
        ("I like", [
            ("chocolate", "chocolate"), ("eu gosto", "I like"), ("Eu gosto de chocolate.", "I like chocolate."), ("Não gosto de leite.", "I don't like milk."),
            ("Você gosta de cachorros?", "Do you like dogs?"), ("Eu adoro!", "I love it!"),
        ]),
    ]),
    ("u5", "Colors, numbers and questions", [
        ("Colors", [
            ("azul", "blue"), ("verde", "green"), ("amarelo", "yellow"), ("branco", "white"), ("O carro é azul.", "The car is blue."), ("a casa branca", "the white house"),
        ]),
        ("How many?", [
            ("dois gatos", "two cats"), ("três maçãs", "three apples"), ("cinco livros", "five books"), ("dez cachorros", "ten dogs"),
            ("Quantos anos você tem?", "How old are you?"), ("Eu tenho sete anos.", "I'm seven years old."),
        ]),
        ("What? Who? Where?", [
            ("O que é isso?", "What is this?"), ("Quem é?", "Who is it?"), ("Cadê a mamãe?", "Where's mom?"), ("Por quê?", "Why?"),
            ("É um gato.", "It's a cat."), ("Como você se chama?", "What's your name?"),
        ]),
    ]),
    ("u6", "Where things are", [
        ("In, on, under", [
            ("em", "in / on"), ("embaixo de", "under"), ("em cima de", "on top of"), ("O livro está na mesa.", "The book is on the table."),
            ("O gato está embaixo da cama.", "The cat is under the bed."), ("O leite está na cozinha.", "The milk is in the kitchen."),
        ]),
        ("Here and there", [
            ("aqui", "here"), ("ali", "there"), ("perto", "near"), ("longe", "far"), ("O banheiro é ali.", "The bathroom is over there."), ("Fica perto?", "Is it near?"),
        ]),
        ("Left and right", [
            ("esquerda", "left"), ("direita", "right"), ("reto", "straight ahead"), ("Vire à esquerda.", "Turn left."), ("Siga reto.", "Go straight ahead."), ("Fica à direita.", "It's on the right."),
        ]),
    ]),
    ("u7", "Meeting people", [
        ("Names", [
            ("nome", "name"), ("Qual é o seu nome?", "What's your name?"), ("Meu nome é Ana.", "My name is Ana."), ("Prazer.", "Nice to meet you."),
            ("O prazer é meu.", "The pleasure is mine."), ("Este é o meu amigo.", "This is my friend."),
        ]),
        ("Where are you from?", [
            ("De onde você é?", "Where are you from?"), ("Sou dos Estados Unidos.", "I'm from the United States."), ("Onde você mora?", "Where do you live?"),
            ("Moro em São Paulo.", "I live in São Paulo."), ("Você fala inglês?", "Do you speak English?"), ("Falo um pouco de português.", "I speak a little Portuguese."),
        ]),
        ("Getting to know you", [
            ("Tudo bem?", "How are you? / All good?"), ("Tudo bem, e você?", "All good, and you?"), ("O que você faz?", "What do you do for a living?"),
            ("Sou professora.", "I'm a teacher. (woman)"), ("Tenho trinta anos.", "I'm thirty years old."), ("Sou casado.", "I'm married. (man)"),
        ]),
    ]),
    ("u8", "Shopping and eating out", [
        ("At the shop", [
            ("Quanto custa?", "How much does it cost?"), ("É muito caro.", "It's very expensive."), ("Está barato.", "It's cheap."), ("Vou levar.", "I'll take it."),
            ("Tem outro tamanho?", "Do you have another size?"), ("Só estou olhando, obrigado.", "I'm just looking, thanks."),
        ]),
        ("At the restaurant", [
            ("Uma mesa para dois, por favor.", "A table for two, please."), ("O cardápio, por favor.", "The menu, please."), ("O que você recomenda?", "What do you recommend?"),
            ("A conta, por favor.", "The check, please."), ("Posso pagar com cartão?", "Can I pay by card?"), ("O serviço está incluído?", "Is the service charge included?"),
        ]),
        ("Ordering food", [
            ("Eu queria um café.", "I'd like a coffee."), ("Para mim, o frango.", "The chicken for me."), ("sem cebola", "without onion"),
            ("Sou vegetariano.", "I'm vegetarian. (man)"), ("Está uma delícia!", "It's delicious!"), ("Pode me trazer um copo de água?", "Could you bring me a glass of water?"),
        ]),
    ]),
    ("u9", "My day", [
        ("Morning routine", [
            ("Eu acordo às sete.", "I wake up at seven."), ("Eu tomo banho.", "I take a shower."), ("Tomo café com pão de queijo.", "I have coffee and cheese bread for breakfast."),
            ("Eu me visto.", "I get dressed."), ("Saio de casa às oito.", "I leave home at eight."), ("Vou para o trabalho de ônibus.", "I go to work by bus."),
        ]),
        ("Time and days", [
            ("Que horas são?", "What time is it?"), ("São três horas.", "It's three o'clock."), ("hoje", "today"), ("amanhã", "tomorrow"), ("ontem", "yesterday"),
            ("Na segunda eu trabalho.", "On Monday I work."),
        ]),
        ("What did you do?", [
            ("O que você fez ontem?", "What did you do yesterday?"), ("Fui ao parque.", "I went to the park."), ("Almocei com a minha família.", "I had lunch with my family."),
            ("Vi um filme.", "I watched a movie."), ("Fiquei em casa o dia todo.", "I stayed home all day."), ("Foi muito legal.", "It was really fun."),
        ]),
    ]),
    ("u10", "Telling stories", [
        ("Once upon a time", [
            ("Era uma vez uma menina.", "Once upon a time there was a girl."), ("Ela morava numa cidade pequena.", "She lived in a small town."),
            ("Todos os dias ela andava até o rio.", "Every day she walked to the river."), ("Um dia ela encontrou uma caixa.", "One day she found a box."),
            ("de repente", "suddenly"), ("E viveram felizes para sempre.", "And they lived happily ever after."),
        ]),
        ("Describing people", [
            ("Ele é alto e magro.", "He's tall and thin."), ("Ela tem o cabelo comprido.", "She has long hair."), ("Ele usa óculos.", "He wears glasses."),
            ("Ela é muito simpática.", "She's very nice."), ("Ele é um pouco tímido.", "He's a bit shy."), ("Ela é parecida com a mãe.", "She looks like her mother."),
        ]),
        ("First, then, finally", [
            ("primeiro", "first"), ("depois", "afterwards"), ("no final", "in the end"), ("Enquanto eu cozinhava, o telefone tocou.", "While I was cooking, the phone rang."),
            ("Quando cheguei, ele já tinha saído.", "When I arrived, he had already left."), ("Por isso cheguei atrasado.", "That's why I was late."),
        ]),
    ]),
    ("u11", "Messages and plans", [
        ("Text messages", [
            ("Até mais tarde.", "See you later."), ("Estou um pouco atrasado.", "I'm running a bit late."), ("Já cheguei.", "I'm here. / I've arrived."),
            ("Pode me ligar?", "Can you call me?"), ("Te mando mensagem mais tarde.", "I'll text you later."), ("Me avisa quando chegar.", "Let me know when you get there."),
        ]),
        ("Invitations", [
            ("Quer vir na minha festa?", "Do you want to come to my party?"), ("Claro que sim!", "Of course!"), ("Obrigado pelo convite.", "Thanks for the invitation."),
            ("Desculpa, não posso.", "Sorry, I can't."), ("Já tenho outro compromisso.", "I already have another commitment."), ("Fica para a próxima!", "Next time, for sure!"),
        ]),
        ("Making plans", [
            ("Você está livre no sábado?", "Are you free on Saturday?"), ("Que tal a gente ir ao cinema?", "How about going to the movies?"),
            ("A gente se encontra às oito na praça.", "Let's meet at eight in the square."), ("Vou reservar uma mesa.", "I'm going to book a table."),
            ("Se chover, a gente fica em casa.", "If it rains, we'll stay home."), ("Perfeito para mim.", "Sounds perfect to me."),
        ]),
    ]),
    ("u12", "Work and money", [
        ("At the office", [
            ("a reunião", "the meeting"), ("a chefe", "the boss (woman)"), ("colega de trabalho", "coworker"), ("Tenho uma reunião às dez.", "I have a meeting at ten."),
            ("O relatório tem que estar pronto até sexta.", "The report has to be ready by Friday."), ("Estou atolado de trabalho.", "I'm swamped with work."),
        ]),
        ("The job interview", [
            ("experiência", "experience"), ("Tenho cinco anos de experiência em vendas.", "I have five years of experience in sales."),
            ("Quais são os seus pontos fortes?", "What are your strengths?"), ("Trabalho bem em equipe.", "I work well in a team."),
            ("Por que você quer esta vaga?", "Why do you want this position?"), ("Quando você poderia começar?", "When could you start?"),
        ]),
        ("Money", [
            ("o salário", "the salary"), ("o aluguel", "the rent"), ("Tenho que pagar o aluguel.", "I have to pay the rent."),
            ("Quero abrir uma conta poupança.", "I want to open a savings account."), ("Estou juntando dinheiro para uma viagem.", "I'm saving up for a trip."),
            ("Me cobraram a mais.", "They overcharged me."),
        ]),
    ]),
    ("u13", "Health and feelings", [
        ("At the doctor", [
            ("Estou com dor de cabeça.", "I have a headache."), ("Dói aqui.", "It hurts here."), ("Estou com febre desde ontem.", "I've had a fever since yesterday."),
            ("Sou alérgico a penicilina.", "I'm allergic to penicillin. (man)"), ("Tome isto duas vezes por dia.", "Take this twice a day."),
            ("Preciso marcar uma consulta.", "I need to make a doctor's appointment."),
        ]),
        ("How I feel", [
            ("Estou preocupada com o meu irmão.", "I'm worried about my brother. (woman)"), ("Ando muito estressado.", "I've been very stressed lately. (man)"),
            ("Tenho orgulho de você.", "I'm proud of you."), ("Estou me sentindo bem melhor.", "I feel much better."), ("Que vergonha.", "How embarrassing."),
            ("Não se preocupe.", "Don't worry."),
        ]),
        ("Giving advice", [
            ("Você deveria descansar.", "You should rest."), ("Se eu fosse você, iria ao médico.", "If I were you, I'd go to the doctor."),
            ("No seu lugar, eu não falaria nada.", "In your shoes, I wouldn't say anything."), ("Recomendo que você durma mais.", "I recommend that you sleep more."),
            ("É importante que você beba muita água.", "It's important that you drink lots of water."), ("Melhoras!", "Get well soon!"),
        ]),
    ]),
    ("u14", "Travel problems", [
        ("At the airport", [
            ("Meu voo foi cancelado.", "My flight was cancelled."), ("Perdi o meu passaporte.", "I lost my passport."), ("Minha mala não chegou.", "My suitcase didn't arrive."),
            ("O voo está atrasado duas horas.", "The flight is delayed two hours."), ("Perdi a conexão.", "I missed my connection."),
            ("Vocês podem me colocar em outro voo?", "Can you put me on another flight?"),
        ]),
        ("Hotel complaints", [
            ("O ar-condicionado não funciona.", "The air conditioning doesn't work."), ("Não tem água quente.", "There's no hot water."),
            ("Tem muito barulho no quarto.", "It's very noisy in the room."), ("Poderia me trocar de quarto?", "Could you move me to another room?"),
            ("Eu gostaria de falar com o gerente.", "I'd like to speak to the manager."), ("Não foi isso que eu reservei.", "This isn't what I booked."),
        ]),
        ("Asking for help", [
            ("Poderia me ajudar, por favor?", "Could you help me, please?"), ("Roubaram a minha carteira.", "My wallet was stolen."),
            ("Quero fazer um boletim de ocorrência.", "I want to report it to the police."), ("Onde fica a embaixada?", "Where is the embassy?"),
            ("Chame uma ambulância!", "Call an ambulance!"), ("Estou perdido.", "I'm lost. (man)"),
        ]),
    ]),
    ("u15", "News and opinions", [
        ("Headlines", [
            ("o governo", "the government"), ("as eleições", "the elections"), ("a economia", "the economy"), ("Os preços subiram de novo.", "Prices have gone up again."),
            ("O desemprego caiu pelo terceiro mês seguido.", "Unemployment fell for the third month in a row."), ("Milhares de pessoas foram às ruas.", "Thousands of people took to the streets."),
        ]),
        ("Talking about the news", [
            ("Você ficou sabendo que o ministro renunciou?", "Did you hear that the minister resigned?"), ("Segundo os especialistas, a situação vai piorar.", "According to experts, the situation is going to get worse."),
            ("Vi no jornal ontem à noite.", "I saw it on the news last night."), ("Dizem que vai ter greve na segunda.", "They say there'll be a strike on Monday."),
            ("Não acredito!", "I can't believe it!"), ("Tem que ver de onde vem a notícia.", "You have to check where the story comes from."),
        ]),
        ("Giving your opinion", [
            ("Na minha opinião, é um erro.", "In my opinion, it's a mistake."), ("Acho que você tem razão.", "I think you're right."),
            ("Não acho que seja justo.", "I don't think it's fair."), ("Me parece que estão exagerando.", "It seems to me they're exaggerating."),
            ("Do meu ponto de vista, há outras prioridades.", "The way I see it, there are other priorities."), ("Depende do ponto de vista.", "It depends on how you look at it."),
        ]),
    ]),
    ("u16", "Debate", [
        ("Agreeing and disagreeing", [
            ("Concordo totalmente.", "I completely agree."), ("Não concordo de jeito nenhum.", "I don't agree at all."),
            ("Entendo o seu ponto, mas não vejo assim.", "I see your point, but I don't see it that way."), ("Nisso você tem razão.", "You're right about that."),
            ("Até certo ponto, sim.", "Up to a point, yes."), ("Nem pensar!", "No way!"),
        ]),
        ("Making your case", [
            ("Por um lado, é mais barato.", "On the one hand, it's cheaper."), ("Por outro lado, polui mais.", "On the other hand, it pollutes more."),
            ("Isso não é bem verdade.", "That's not entirely true."), ("Temos que levar em conta o custo.", "We have to take the cost into account."),
            ("Mesmo que seja difícil, vale a pena.", "Even if it's hard, it's worth it."), ("no entanto", "however"),
        ]),
        ("Persuading and concluding", [
            ("Os dados mostram o contrário.", "The data show the opposite."), ("Imagina se fosse com você.", "Imagine if it happened to you."),
            ("Não se trata de dinheiro, e sim de princípios.", "It's not about money, it's about principles."), ("Resumindo, precisamos de uma mudança.", "In short, we need a change."),
            ("Para concluir, quero agradecer a todos.", "To conclude, I'd like to thank everyone."), ("Vamos concordar em discordar.", "Let's agree to disagree."),
        ]),
    ]),
    ("u17", "Formal and casual", [
        ("Você or o senhor?", [
            ("Como o senhor está?", "How are you? (formal, to a man)"), ("E aí, beleza?", "What's up? (casual)"), ("Pode me chamar de você.", "You can call me “você”."),
            ("Bom dia, senhora.", "Good morning, ma'am."), ("Pode entrar, fique à vontade.", "Come in, make yourself at home."), ("Imagina!", "Not at all! / You're welcome."),
        ]),
        ("Polite requests", [
            ("Será que o senhor poderia me ajudar?", "Would you be able to help me, sir?"), ("Eu agradeceria se me respondesse logo.", "I would be grateful if you replied soon."),
            ("Poderia me dizer onde fica o escritório?", "Could you tell me where the office is?"), ("Desculpe incomodar.", "Sorry to bother you."),
            ("Me passa o sal?", "Pass me the salt? (casual)"), ("Me vê um café, por favor?", "Can I get a coffee, please?"),
        ]),
        ("Formal writing", [
            ("Prezado Sr. Silva,", "Dear Mr. Silva,"), ("Venho por meio desta solicitar informações.", "I am writing to request information."),
            ("Segue em anexo o meu currículo.", "Please find my résumé attached."), ("Fico no aguardo da sua resposta.", "I look forward to your reply."),
            ("Atenciosamente,", "Sincerely,"), ("Abraços,", "Hugs, (to a friend)"),
        ]),
    ]),
    ("u18", "Idioms", [
        ("Everyday idioms", [
            ("Você está no mundo da lua.", "You're daydreaming. (lit. on the moon)"), ("Custou os olhos da cara.", "It cost an arm and a leg."),
            ("Ela não tem papas na língua.", "She doesn't mince her words."), ("Pisei na bola.", "I messed up. (lit. I stepped on the ball)"),
            ("Você está me zoando.", "You're pulling my leg."), ("É moleza.", "It's a piece of cake."),
        ]),
        ("More idioms", [
            ("Você acertou na mosca.", "You hit the nail on the head."), ("Estou morto de cansaço.", "I'm exhausted. (man)"),
            ("Se liga!", "Get your act together! / Pay attention!"), ("Não preguei o olho a noite toda.", "I didn't sleep a wink all night."),
            ("Estou entre a cruz e a espada.", "I'm between a rock and a hard place."), ("Ele fala pelos cotovelos.", "He talks nonstop."),
        ]),
        ("Sayings", [
            ("Antes tarde do que nunca.", "Better late than never."), ("Em boca fechada não entra mosca.", "Silence is golden. (lit. no flies get into a closed mouth)"),
            ("Quem não arrisca não petisca.", "Nothing ventured, nothing gained."), ("Falar é fácil, fazer é que é difícil.", "Easier said than done."),
            ("Há males que vêm para bem.", "Every cloud has a silver lining."), ("Diga-me com quem andas e eu te direi quem és.", "You are the company you keep."),
        ]),
    ]),
    ("u19", "Slang", [
        ("Brazilian slang", [
            ("Que legal!", "How cool!"), ("cara", "dude, guy"), ("Beleza!", "OK! / Cool!"), ("Valeu!", "Thanks! / Cheers!"), ("Tô de boa.", "I'm chilling. / I'm fine."),
            ("Que massa!", "Awesome! (northeast Brazil)"),
        ]),
        ("Fillers and reactions", [
            ("tipo", "like"), ("Então…", "So… / Well…"), ("Sério?", "Seriously?"), ("Que mico!", "How embarrassing!"), ("Fazer o quê?", "Oh well, what can you do?"),
            ("Nossa!", "Wow! / Oh my!"),
        ]),
        ("Talking casually", [
            ("Pra quê?", "What for? (casual)"), ("Não tô a fim.", "I'm not in the mood."), ("Tô sem grana.", "I'm broke."), ("E aí, mano? Suave?", "What's up, bro? All chill?"),
            ("Tranquilo, sem problema.", "All good, no worries."), ("Falou, até mais!", "Later, see you!"),
        ]),
    ]),
    ("u20", "Fluent conversation", [
        ("Small talk with nuance", [
            ("Quanto tempo!", "Long time no see!"), ("O que você tem feito da vida?", "What have you been up to?"), ("Vou levando.", "Getting by."),
            ("Nem me fale.", "Don't even get me started."), ("Que bom que está dando tudo certo.", "I'm glad things are going well."),
            ("Vamos marcar alguma coisa qualquer dia.", "Let's get together one of these days."),
        ]),
        ("Telling a story well", [
            ("Você não vai acreditar no que aconteceu.", "You're not going to believe what happened."), ("Acontece que ele tinha esquecido.", "It turns out he had forgotten."),
            ("Resumo da ópera: perdemos o trem.", "Long story short, we missed the train."), ("E pra completar, começou a chover.", "And to top it all off, it started to rain."),
            ("Eu morri de rir.", "I died laughing."), ("No fim das contas, deu tudo certo.", "In the end, everything turned out fine."),
        ]),
        ("Clearing things up", [
            ("O que eu quis dizer é que…", "What I meant was that…"), ("Em outras palavras…", "In other words…"), ("Como assim?", "What do you mean?"),
            ("Não me leve a mal.", "Don't get me wrong."), ("Deu para entender?", "Do you see what I mean?"), ("Ah, agora entendi!", "Oh, now I get it!"),
        ]),
    ]),
    ("u21", "Dating & relationships", "dt-", [
        ("Meeting someone", [
            ("Você se importa se eu sentar aqui?", "Do you mind if I sit here?"), ("E você, conhece a Laura de onde?", "And how do you know Laura?"),
            ("Que música boa aqui!", "They play great music here!"), ("Adorei o seu estilo.", "I love your style."), ("Você tem um sorriso lindo.", "You have a lovely smile."),
            ("Ah, obrigada! Que fofo.", "Oh, thank you! That's sweet."),
        ]),
        ("Asking someone out", [
            ("Quer tomar alguma coisa qualquer dia?", "Would you like to get a drink sometime?"), ("Que tal um cinema no sábado?", "How about the movies on Saturday?"),
            ("Eu adoraria!", "I'd love to!"), ("Esse fim de semana não dá, mas e no próximo?", "I can't this weekend, but how about the next one?"),
            ("Obrigada, mas estou saindo com alguém.", "Thanks, but I'm seeing someone."), ("Agradeço, mas prefiro que a gente seja só amigo.", "I appreciate it, but I'd rather we just be friends."),
        ]),
    ]),
    ("u22", "Texting & dating apps", "dt-", [
        ("Texting", [
            ("Oi, sumido! Tudo bem?", "Hey stranger! How's it going?"), ("Kkkkk, você me fez rir 😂", "Hahaha, you made me laugh 😂", {"say": "Você me fez rir."}),
            ("Bora marcar na quinta?", "Shall we make plans for Thursday?"), ("Cheguei bem em casa. Obrigada pela noite ❤️", "Got home safe. Thanks for tonight ❤️", {"say": "Cheguei bem em casa. Obrigada pela noite."}),
            ("Desculpa, esqueci de responder 🙈", "Sorry, I forgot to reply 🙈", {"say": "Desculpa, esqueci de responder."}), ("Você me deixou no vácuo!", "You left me on read!"),
        ]),
        ("Dating apps", [
            ("Deu match!", "We matched!"), ("Ri muito da sua foto com o cachorro 🐶", "Your photo with the dog made me laugh 🐶", {"say": "Ri muito da sua foto com o cachorro."}),
            ("Qual foi a coisa mais espontânea que você já fez?", "What's the most spontaneous thing you've ever done?"), ("Que tal um café pra gente se conhecer?", "How about a coffee to get to know each other?"),
            ("Por enquanto não procuro nada sério.", "I'm not looking for anything serious right now."), ("Você é muito legal, mas não rolou química.", "You're really great, but there wasn't any chemistry."),
        ]),
    ]),
    ("u23", "Love, couples & family", "dt-", [
        ("Talking about feelings", [
            ("Eu me sinto muito à vontade com você.", "I feel really comfortable with you."), ("Acho que estou me apaixonando por você.", "I think I'm falling for you."),
            ("Queria saber o que a gente é.", "I'd like to know where we stand."), ("Para mim é importante a gente conversar.", "It matters to me that we talk."),
            ("Preciso de um pouco de espaço, mas te amo.", "I need a little space, but I love you."), ("Estamos juntos há dois anos e pensando em morar juntos.", "We've been together two years and we're thinking of moving in together."),
        ]),
        ("Meeting the family", [
            ("Muito prazer, dona Maria. O Pedro fala muito de vocês.", "Nice to meet you, Mrs. Maria. Pedro talks about you all a lot."), ("Trouxe uma lembrancinha.", "I brought you a little something."),
            ("Que delícia! Foi a senhora que fez?", "This is delicious! Did you make it?"), ("Deixa que eu ajudo a tirar a mesa.", "Let me help clear the table."),
            ("Minha sogra é um amor.", "My mother-in-law is a sweetheart."), ("A gente se vê no almoço de domingo.", "See you at Sunday lunch."),
        ]),
    ]),
    ("u24", "Flirting with charm", "fl-", [
        ("Compliments", [
            ("Adoro o jeito que você ri.", "I love the way you laugh."), ("Você tem uma voz muito bonita.", "You have a really nice voice."),
            ("Essa cor fica incrível em você.", "That color looks amazing on you."), ("Eu dou muita risada com você.", "I laugh so much with you."),
            ("Você tem olhos lindos.", "You have beautiful eyes."), ("Que bom gosto musical!", "You have such good taste in music!"),
        ]),
        ("Reading the signals", [
            ("Você está me paquerando?", "Are you flirting with me?"), ("Acho que você está a fim dele.", "I think you're into him."),
            ("Ela não para de olhar para você.", "She can't stop looking at you."), ("Ele dá sinais, mas não sei se é só simpatia.", "He gives signals, but I don't know if he's just being friendly."),
            ("Se ela continua a conversa, é bom sinal.", "If she keeps the conversation going, it's a good sign."), ("Eu adoraria te conhecer melhor.", "I'd love to get to know you better."),
        ]),
    ]),
    ("u25", "Playful teasing & pick-up lines", "fl-", [
        ("Teasing and comebacks", [
            ("Você é sempre assim ou é só comigo?", "Are you always like this, or is it just with me?"), ("Nossa, que convencido 😏", "Wow, someone's full of himself 😏", {"say": "Nossa, que convencido."}),
            ("Ganhei de novo. Admite.", "I won again. Admit it."), ("Não disfarça, eu vi você sorrir.", "Don't play innocent, I saw you smile."),
            ("Você me deve um café por essa.", "You owe me a coffee for that one."), ("Tá bom, você ganhou… dessa vez.", "Fine, you win… this time."),
        ]),
        ("Pick-up lines, smooth and cheesy", [
            ("Me recomenda algo do cardápio? Você tem cara de quem sabe.", "Can you recommend something on the menu? You look like you'd know."),
            ("Você acredita em amor à primeira vista, ou eu passo de novo?", "Do you believe in love at first sight, or should I walk by again?"),
            ("Você tem um mapa? Me perdi nos seus olhos.", "Do you have a map? I got lost in your eyes."), ("Doeu quando você caiu do céu?", "Did it hurt when you fell from heaven?"),
            ("Essa foi péssima, mas te fiz rir.", "That one was terrible, but I made you laugh."), ("Posso te pagar uma bebida?", "Can I buy you a drink?"),
        ]),
    ]),
    ("u26", "Flirty texts & clear signals", "fl-", [
        ("Flirty texts and app openers", [
            ("Duas verdades e uma mentira: você começa 😉", "Two truths and a lie: you go first 😉", {"say": "Duas verdades e uma mentira: você começa."}),
            ("Sua foto na montanha me deixou curioso. Onde foi?", "Your mountain photo got me curious. Where was it?"),
            ("Não paro de pensar na nossa conversa de ontem 🙈", "I can't stop thinking about our conversation last night 🙈", {"say": "Não paro de pensar na nossa conversa de ontem."}),
            ("Bom dia, dormiu bem? ☀️", "Good morning, did you sleep well? ☀️", {"say": "Bom dia, dormiu bem?"}),
            ("Você me deve a revanche na sinuca 😏", "You owe me a rematch at pool 😏", {"say": "Você me deve a revanche na sinuca."}),
            ("Quando quiser, a gente repete 😘", "Let's do it again whenever you want 😘", {"say": "Quando quiser, a gente repete."}),
        ]),
        ("Smooth moves and graceful exits", [
            ("Gostei muito de você. Posso pegar o seu número?", "I really like you. Can I get your number?"), ("Que tal a gente continuar a conversa em outro lugar?", "How about we continue this conversation somewhere else?"),
            ("Adorei te conhecer. Espero te ver de novo.", "I loved meeting you. I hope I see you again."), ("Acho que eu entendi errado. Desculpa.", "I think I misread things. Sorry."),
            ("Sem problema, foi um prazer conversar com você.", "No worries, it was lovely chatting with you."), ("Respeito a sua resposta.", "I respect your answer."),
        ]),
    ]),
    ("u27", "Culture: greetings & gestures", "cu-", [
        ("Greetings and gestures", [
            ("Oi, tudo bem?", "Hi, how are you?"), ("Tudo bom!", "All good!"), ("E aí?", "What's up?"), ("Prazer!", "Nice to meet you!"),
            ("Um beijo, tchau!", "A kiss, bye! (a friendly goodbye)"), ("Com licença.", "Excuse me (when you pass by or leave)."),
        ], [
            {"q": "How many kisses on the cheek are usual in São Paulo?", "options": ["One", "Three", "None, just a handshake"], "answer": 0},
            {"q": "In Brazil, the 👌 “OK” sign made with your fingers…", "options": ["…is rude: use a thumbs up 👍 instead", "…means “perfect”", "…means “money”"], "answer": 0},
            {"q": "A Brazilian friend says “Tudo bem?” What do you answer?", "options": ["“Tudo!” or “Tudo bem, e você?”", "A long list of your problems", "“Prazer”"], "answer": 0},
        ]),
    ]),
    ("u28", "Culture: food & table manners", "cu-", [
        ("Food and the table", [
            ("Bom apetite!", "Enjoy your meal!"), ("O que você recomenda?", "What do you recommend?", {"id": "cu-o-que-voce-recomenda"}), ("Pode fechar a conta?", "Can you bring the check?"),
            ("Qual é o prato do dia?", "What's the dish of the day?"), ("Estava tudo uma delícia.", "Everything was delicious."), ("Dá para embrulhar para viagem?", "Could you pack it up to take away?"),
        ], [
            {"q": "What is the biggest meal of the day for most Brazilians?", "options": ["Lunch (almoço)", "Breakfast", "A late snack"], "answer": 0},
            {"q": "At a “restaurante por quilo”, you pay…", "options": ["By the weight of your plate", "A fixed price per person", "Only for drinks"], "answer": 0},
            {"q": "The 10% “serviço” on a Brazilian bill is…", "options": ["A tip you may decline", "A tax you must pay", "A fee for bread"], "answer": 0},
        ]),
    ]),
    ("u29", "Culture: holidays & celebrations", "cu-", [
        ("Holidays and celebrations", [
            ("Feliz Natal e um próspero Ano Novo!", "Merry Christmas and a happy New Year!"), ("Parabéns! Quantos anos você está fazendo?", "Happy birthday! How old are you turning?"),
            ("No Réveillon a gente pula sete ondas.", "On New Year's Eve we jump seven waves."), ("Na festa junina tem quadrilha e pamonha.", "At the June festival there's square dancing and corn cakes."),
            ("O Carnaval dura quatro dias.", "Carnival lasts four days."), ("Segunda é feriado, vai ter feriadão!", "Monday is a holiday: it's a long weekend!"),
        ], [
            {"q": "What color do many Brazilians wear on New Year's Eve?", "options": ["White", "Black", "Green"], "answer": 0},
            {"q": "Festa junina celebrates…", "options": ["June saints and country life, with bonfires and corn food", "The start of Carnival", "Independence Day"], "answer": 0},
            {"q": "At a Brazilian birthday, everyone sings…", "options": ["“Parabéns pra você”", "“Feliz cumpleaños”", "Nothing: they just clap"], "answer": 0},
        ]),
    ]),
    ("u30", "Culture: etiquette & mistakes to avoid", "cu-", [
        ("Etiquette and common mistakes", [
            ("Desculpa, me enganei.", "Sorry, I made a mistake."), ("Com licença, sabe onde fica o banheiro?", "Excuse me, do you know where the bathroom is?"),
            ("Já volto.", "I'll be right back."), ("Relaxa, não tem problema.", "Relax, it's no problem."), ("De nada!", "You're welcome!"), ("Imagina, não foi nada.", "Don't mention it, it was nothing."),
        ], [
            {"q": "“Esquisito” means…", "options": ["Weird, strange", "Exquisite", "Expensive"], "answer": 0},
            {"q": "A Brazilian says “Passa lá em casa!” (Drop by my place!). Usually it's…", "options": ["A friendly way to say goodbye, not a fixed plan", "A firm invitation for tonight", "Rude"], "answer": 0},
            {"q": "Which is true about being on time in Brazil?", "options": ["Parties start late; work meetings should be on time", "Arriving early to a party is polite", "Nobody is ever on time for anything"], "answer": 0},
        ]),
    ]),
    ("u31", "Culture: Brazil and Portugal", "cu-", [
        ("Brazil and Portugal", [
            ("Que legal!", "How cool! (Brazil)", {"id": "cu-que-legal"}), ("Que fixe!", "How cool! (Portugal)"), ("Vou pegar o ônibus.", "I'm taking the bus. (Brazil)"),
            ("Vou apanhar o autocarro.", "I'm taking the bus. (Portugal)"), ("Bah, tchê!", "Wow, buddy! (southern Brazil)"), ("Que trem bom!", "What a great thing! (Minas Gerais)"),
        ], [
            {"q": "“Fixe” for “cool” sounds like someone from…", "options": ["Portugal", "Rio de Janeiro", "Bahia"], "answer": 0},
            {"q": "A mobile phone in Brazil is a…", "options": ["celular", "telemóvel", "móvil"], "answer": 0},
            {"q": "In Minas Gerais, “trem” can mean…", "options": ["Almost any thing or stuff", "Only a train", "A train ticket"], "answer": 0},
        ]),
    ]),
]
