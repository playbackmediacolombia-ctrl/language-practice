"""Brazilian Portuguese: chants and songs (music mode), the phrasebook, and the coach's lines."""

CHANTS = [
    {"id": "pt-chant-oi", "level": 1, "kind": "chant", "title": "Oi, oi", "en": "Hi, hi", "bpm": 96, "lines": [
        ("Oi, oi, tudo bem?", "Hi, hi, how are you?"), ("Tudo bem, tudo bom, e você também?", "All good, all fine, and you too?"),
        ("Bom dia, boa tarde, boa noite.", "Good morning, good afternoon, good night."), ("Até amanhã, um beijo e tchau!", "See you tomorrow, a kiss and bye!")]},
    {"id": "pt-chant-semana", "level": 2, "kind": "chant", "title": "Os dias da semana", "en": "The days of the week", "bpm": 100, "lines": [
        ("Segunda, terça, quarta, três.", "Monday, Tuesday, Wednesday: three."), ("Quinta, sexta, já são cinco de uma vez.", "Thursday, Friday, that's five at once."),
        ("Sábado e domingo, vou descansar.", "Saturday and Sunday, I'll rest."), ("E na segunda tudo volta a começar!", "And on Monday it all starts again!")]},
    {"id": "pt-chant-feira", "level": 3, "kind": "song", "title": "Ontem na feira", "en": "Yesterday at the market", "bpm": 92, "lines": [
        ("Ontem eu fui à feira comprar.", "Yesterday I went to the market to shop."), ("Comprei manga, abacaxi e pão para o jantar.", "I bought mango, pineapple and bread for dinner."),
        ("Conversei com a moça do pastel,", "I chatted with the pastel lady,"), ("e voltei para casa cantando ao céu!", "and came home singing to the sky!")]},
    {"id": "pt-chant-se-eu-tivesse", "level": 4, "kind": "song", "title": "Se eu tivesse tempo", "en": "If I had time", "bpm": 88, "lines": [
        ("Se eu tivesse tempo, eu iria ao mar.", "If I had time, I'd go to the sea."), ("Se eu tivesse asas, eu ia voar.", "If I had wings, I'd fly."),
        ("Mas hoje eu estudo, passo a passo vou,", "But today I study, step by step I go,"), ("e cada palavra me mostra quem sou!", "and every word shows me who I am!")]},
    {"id": "pt-chant-tomara", "level": 5, "kind": "song", "title": "Tomara", "en": "I hope", "bpm": 84, "lines": [
        ("Tomara que amanhã faça sol.", "I hope it's sunny tomorrow."), ("Tomara que você me escreva com amor.", "I hope you write to me with love."),
        ("Espero que você siga, que não desista,", "I hope you keep going, that you don't give up,"), ("que as palavras abram portas à vista!", "that words open doors in sight!")]},
    {"id": "pt-chant-beleza", "level": 6, "kind": "chant", "title": "E aí, beleza?", "en": "Hey, all good?", "bpm": 104, "lines": [
        ("E aí, beleza? Tudo certo, tudo em paz.", "Hey, all good? Everything's fine, all at peace."), ("Falo português e quero sempre mais.", "I speak Portuguese and always want more."),
        ("Não tenho vergonha, eu mando ver,", "I'm not shy, I go for it,"), ("e se eu errar, dou risada e vou aprender!", "and if I get it wrong, I laugh and I'll learn!")]},
]

# The phrasebook, by phrase id (the English and the topics are shared by every language).
PHRASES = {
    "greet-hello": "Olá", "greet-goodbye": "Tchau", "greet-thanks": "Obrigado", "greet-how-are-you": "Como vai você?", "greet-fine": "Estou bem, obrigado.",
    "greet-name-q": "Como você se chama?", "greet-name-a": "Meu nome é Ana.", "greet-nice": "Prazer em conhecer.",
    "food-hungry": "Estou com fome.", "food-water": "Água, por favor.", "food-menu": "O cardápio, por favor.", "food-coffee": "Eu queria um café.",
    "food-delicious": "Está uma delícia!", "food-no-meat": "Eu não como carne.", "food-check": "A conta, por favor.", "food-cheers": "Saúde!",
    "travel-airport": "Onde fica o aeroporto?", "travel-hotel": "Onde fica o hotel?", "travel-reservation": "Eu tenho uma reserva.", "travel-ticket": "Uma passagem, por favor.",
    "travel-cost": "Quanto custa?", "travel-taxi": "Preciso de um táxi.", "travel-train": "A que horas sai o trem?", "travel-understand": "Não entendo.",
    "num-123": "Um, dois, três.", "num-456": "Quatro, cinco, seis.", "num-7-10": "Sete, oito, nove, dez.", "num-children": "Eu tenho dois filhos.",
    "num-age-30": "Eu tenho trinta anos.", "num-age": "Quantos anos você tem?", "num-time": "Que horas são?", "num-price": "São vinte reais.",
    "dir-bathroom": "Onde fica o banheiro?", "dir-left": "Vire à esquerda.", "dir-right": "Vire à direita.", "dir-straight": "Siga reto.",
    "dir-far": "É longe?", "dir-near": "É perto daqui.", "dir-metro": "Onde fica a estação de metrô?", "dir-help": "Pode me ajudar?",
}

# The coach: praise, streaks, lesson complete, a perfect lesson, and gentle words after a miss.
FEEDBACK = {
    "praise": [("Muito bem!", "Very good!"), ("Excelente!", "Excellent!"), ("Perfeito!", "Perfect!"), ("Ótimo!", "Great!"), ("Isso mesmo!", "That's it!"),
               ("Mandou bem!", "Nailed it!"), ("Correto!", "Correct!"), ("Fantástico!", "Fantastic!"), ("Arrasou!", "You rocked it!"), ("Que legal!", "How cool!"),
               ("Boa!", "Nice one!"), ("Acertou!", "You got it!"), ("Maravilha!", "Wonderful!")],
    "streak": [("Você está indo muito bem!", "You're doing really well!"), ("Ninguém te segura!", "Nobody can stop you!"), ("Que sequência!", "What a streak!"),
               ("Continua assim!", "Keep it up!"), ("Você é uma estrela!", "You're a star!")],
    "complete": [("Lição concluída! Muito bem!", "Lesson finished! Very good!"), ("Você conseguiu!", "You did it!"), ("Que trabalho bom!", "Great work!"),
                 ("Parabéns!", "Congratulations!"), ("Hoje você arrasou!", "You were amazing today!")],
    "perfect": [("Perfeito, sem nenhum erro!", "Perfect, not a single mistake!"), ("Nem um errinho! Incrível!", "Not one little mistake! Amazing!"),
                ("Tudo certo! Você é fera!", "All correct! You're a pro!")],
    "wrong": [("Quase.", "Almost."), ("Tudo bem.", "That's OK."), ("Tenta de novo.", "Try again."), ("Aos pouquinhos.", "Little by little."),
              ("Está quase.", "Nearly there."), ("De novo, você consegue.", "Again, you can do it."), ("É assim que se aprende.", "That's how you learn."),
              ("Não se preocupe.", "Don't worry.")],
}
