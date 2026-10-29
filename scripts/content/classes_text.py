"""What the teacher says in the Classes: the Day 1 class for each language, rule cards for units
without a grammar tip, and pronunciation tips. Built into shared/classes/<lang>.json by
scripts/content/classes.py. Everything the teacher says is recorded in English."""

# ---- Rule cards for units that have no grammar tip yet ----
# examples: item ids from the unit (each gets its recording); table: [target, English] rows.

NEW_RULES = {
    "es": {
        "u12": {
            "title": "Tener que + verb: \"have to\"",
            "body": ["To say you have to do something, use tener que followed by a verb in its plain form: tengo que pagar, 'I have to pay'.", "Change only tener for the person: tengo que, tienes que, tiene que."],
            "table": [["Tengo que pagar.", "I have to pay."], ["Tienes que venir.", "You have to come."], ["Tiene que estar listo.", "It has to be ready."]],
            "examples": ["tengo-que-pagar-el-arriendo", "el-informe-es-para-el-viernes"],
            "why": "Tener means 'to have', so tener que is close to English 'have to'. The que links it to the action you're obliged to do.",
        },
        "u18": {
            "title": "Idioms: learn them whole",
            "body": ["An idiom means something different from its words. Estar en las nubes, 'to be in the clouds', means to be daydreaming.", "Learn each idiom as one block, with a situation to use it in. Change only the verb for the person: estás en las nubes, estoy en las nubes."],
            "table": [["Es pan comido.", "It's a piece of cake (it's easy)."], ["Metí la pata.", "I put my foot in it."], ["Me costó un ojo de la cara.", "It cost an arm and a leg."]],
            "examples": ["ser-pan-comido", "meter-la-pata"],
            "why": "Idioms are pictures a language has kept for centuries. Their meaning comes from the picture, not the single words, so translating word by word doesn't work.",
        },
        "u19": {
            "title": "Slang belongs to a place",
            "body": ["Colombian slang like parce (buddy), chévere (cool) and bacano (great) is friendly and casual. Use it with friends, not at a job interview.", "Many reactions are short and fixed: ¡De una! means 'sure, let's do it', ¡Qué pena! means 'how embarrassing' or 'sorry'."],
            "table": [["¡Qué chévere!", "How cool!"], ["¡De una!", "Sure! Right away!"], ["Ni modo.", "Oh well."]],
            "examples": ["que-chevere", "de-una"],
            "why": "Slang grows in a community and marks belonging, so it changes from country to country and signals that you're among friends.",
        },
        "u20": {
            "title": "Telling a story: the linking phrases",
            "body": ["Good storytellers guide the listener. Resulta que, 'it turns out that', introduces the twist. Total que, 'so in the end', sums it up.", "Y para colmo, 'and to top it off', adds the last straw, and al fin y al cabo, 'after all', wraps up."],
            "table": [["Resulta que…", "It turns out that…"], ["Total, que…", "So, in the end…"], ["Al fin y al cabo…", "After all…"]],
            "examples": ["resulta-que", "total-que"],
            "why": "These phrases tell the listener where the story is going: a twist, a summary, an ending. They keep people following, which makes a story feel natural.",
        },
    },
    "fr": {
        "u12": {
            "title": "Devoir + verb: \"have to\"",
            "body": ["To say you have to do something, use devoir followed by a verb in its plain form: je dois payer, 'I have to pay'.", "Devoir changes for the person: je dois, tu dois, il doit."],
            "table": [["Je dois payer.", "I have to pay."], ["Tu dois venir.", "You have to come."], ["Il doit être prêt.", "It has to be ready."]],
            "examples": ["je-dois-payer-le-loyer", "le-rapport-doit-etre-pret"],
            "why": "Devoir means both 'must' and 'to owe', so it carries the idea of something you're obliged to do.",
        },
        "u18": {
            "title": "Idioms: learn them whole",
            "body": ["An idiom means something different from its words. Être dans la lune, 'to be on the moon', means to be daydreaming.", "Learn each one as a block, with a situation. Change only the verb for the person."],
            "table": [["C'est du gâteau.", "It's a piece of cake."], ["J'ai fait une gaffe.", "I made a blunder."], ["Ça m'a coûté les yeux de la tête.", "It cost an arm and a leg."]],
            "examples": ["cest-du-gateau", "faire-une-gaffe"],
            "why": "Idioms are pictures a language has kept for centuries. Their meaning comes from the picture, not the single words.",
        },
        "u20": {
            "title": "Telling a story: the linking words",
            "body": ["En fait, 'actually', brings in the real story. Bref, 'anyway, in short', jumps to the point.", "Et pour couronner le tout, 'and to top it all off', adds the last straw. Au final, 'in the end', wraps up."],
            "table": [["En fait…", "Actually…"], ["Bref…", "Anyway… In short…"], ["Au final…", "In the end…"]],
            "examples": ["en-fait", "bref-on-a-rate-le-train"],
            "why": "These words tell the listener where the story is going, so they can follow along easily.",
        },
    },
    "zh": {
        "u12": {
            "title": "得 (děi): \"have to\"",
            "body": ["To say you have to do something, put 得 (děi) before the verb: 我得交房租了, 'I have to pay the rent'.", "This 得 is read děi, not de. It's casual and common in speech."],
            "table": [["我得走了。", "I have to go."], ["我得交房租。", "I have to pay the rent."], ["你得早点儿来。", "You have to come a bit early."]],
            "examples": ["wo-dei-jiao-fangzu", "baogao-xingqiwu-yao-jiao"],
            "why": "Chinese puts helping verbs like 得, 要 and 想 straight before the action, so the order is: who, then 'have to', then the action.",
        },
        "u18": {
            "title": "Chengyu: four characters, one story",
            "body": ["Chengyu are idioms of four characters, most from old stories. 画蛇添足, 'draw a snake and add feet', means to ruin something by overdoing it.", "Learn each with its story and use it whole; never change the characters."],
            "table": [["马马虎虎", "so-so"], ["一箭双雕", "two birds with one stone"], ["入乡随俗", "when in Rome, do as the Romans do"]],
            "examples": ["ma-ma-huhu", "yi-jian-shuang-diao"],
            "why": "Chengyu keep the compact style of classical Chinese, where each character carried a whole word, so four characters can tell a whole story.",
        },
        "u19": {
            "title": "Internet slang",
            "body": ["A lot of new Chinese slang comes from the internet. 吃瓜 (chī guā), 'eating melon', means watching drama from the side.", "躺平 (tǎng píng), 'lying flat', means opting out of the rat race. Use these with friends, not at work."],
            "table": [["靠谱", "reliable"], ["吃瓜", "watch the drama"], ["躺平", "give up the rat race"]],
            "examples": ["kaopu", "chi-gua"],
            "why": "Slang grows fast online, where short, vivid pictures spread quickly, so it tells people you're part of the conversation.",
        },
        "u20": {
            "title": "Telling a story: 原来, 结果, 好在",
            "body": ["原来 (yuánlái), 'it turns out', reveals the twist. 结果 (jiéguǒ), 'as a result', tells what happened next.", "更糟糕的是, 'what's worse', adds the last straw, and 好在 (hǎozài), 'luckily', brings relief."],
            "table": [["原来……", "It turns out…"], ["结果……", "In the end, as a result…"], ["好在……", "Luckily…"]],
            "examples": ["yuanlai-ta-wang-le", "jieguo-women-mei-ganshang"],
            "why": "Chinese verbs don't change for time, so these linking words do the work of showing how events follow each other.",
        },
    },
    "pt": {
        "u12": {
            "title": "Ter que + verb: \"have to\"",
            "body": ["To say you have to do something, use ter que followed by a verb in its plain form: tenho que pagar, 'I have to pay'.", "Change only ter for the person: tenho que, tem que."],
            "table": [["Tenho que pagar.", "I have to pay."], ["Você tem que vir.", "You have to come."], ["Tem que estar pronto.", "It has to be ready."]],
            "examples": ["tenho-que-pagar-o-aluguel", "o-relatorio-tem-que-estar-pronto-ate-sexta"],
            "why": "Ter means 'to have', so ter que is close to English 'have to'. The que links it to the action.",
        },
        "u18": {
            "title": "Idioms: learn them whole",
            "body": ["An idiom means something different from its words. Estar no mundo da lua, 'to be in the world of the moon', means to be daydreaming.", "Learn each idiom as one block with a situation. Change only the verb for the person."],
            "table": [["É moleza.", "It's a piece of cake."], ["Pisei na bola.", "I messed up."], ["Custou os olhos da cara.", "It cost an arm and a leg."]],
            "examples": ["e-moleza", "pisei-na-bola"],
            "why": "Idioms are pictures a language has kept for centuries. Their meaning comes from the picture, not the single words.",
        },
        "u20": {
            "title": "Telling a story: the linking phrases",
            "body": ["Acontece que, 'it turns out that', brings in the twist. Resumo da ópera, 'the summary of the opera', means 'long story short'.", "E pra completar, 'and to top it off', adds the last straw. No fim das contas, 'in the end', wraps up."],
            "table": [["Acontece que…", "It turns out that…"], ["Resumo da ópera…", "Long story short…"], ["No fim das contas…", "In the end…"]],
            "examples": ["acontece-que-ele-tinha-esquecido", "no-fim-das-contas-deu-tudo-certo"],
            "why": "These phrases tell the listener where the story is going, so it feels natural and easy to follow.",
        },
    },
    "it": {
        "u12": {
            "title": "Dovere + verb: \"have to\"",
            "body": ["To say you have to do something, use dovere followed by a verb in its plain form: devo pagare, 'I have to pay'.", "Dovere changes for the person: devo, devi, deve."],
            "table": [["Devo pagare.", "I have to pay."], ["Devi venire.", "You have to come."], ["Deve essere pronta.", "It has to be ready."]],
            "examples": ["devo-pagare-l-affitto", "la-relazione-deve-essere-pronta-per-venerdi"],
            "why": "Dovere means both 'must' and 'to owe', so it carries the idea of something you're obliged to do.",
        },
        "u18": {
            "title": "Idioms: learn them whole",
            "body": ["An idiom means something different from its words. Avere la testa tra le nuvole, 'to have your head in the clouds', means to be daydreaming.", "Learn each one as a block with a situation. Change only the verb for the person."],
            "table": [["È un gioco da ragazzi.", "It's child's play."], ["Ho fatto una gaffe.", "I made a blunder."], ["Mi è costato un occhio della testa.", "It cost an arm and a leg."]],
            "examples": ["e-un-gioco-da-ragazzi", "ho-fatto-una-gaffe"],
            "why": "Idioms are pictures a language has kept for centuries. Their meaning comes from the picture, not the single words.",
        },
        "u20": {
            "title": "Telling a story: the linking words",
            "body": ["Insomma, 'so, basically', brings in the point. Morale della favola, 'the moral of the fable', means 'long story short'.", "E come se non bastasse, 'and as if that weren't enough', adds the last straw. Alla fine, 'in the end', wraps up."],
            "table": [["Insomma…", "So, basically…"], ["Morale della favola…", "Long story short…"], ["Alla fine…", "In the end…"]],
            "examples": ["insomma-si-era-dimenticato", "alla-fine-e-andato-tutto-bene"],
            "why": "These words tell the listener where the story is going, so it's easy to follow.",
        },
    },
}

# ---- Pronunciation tips: shown under a word when it has the sound (regex on the word) ----

SOUND_TIPS = {
    "es": [
        (r"rr", "rr is a strong rolled r: let the tip of your tongue flutter."),
        (r"ñ", "ñ sounds like the ny in canyon."),
        (r"j|g(?=[ei])", "j (and g before e or i) is a breathy h from the throat, like a strong English h."),
        (r"ll|y(?=[aeiou])", "ll and y sound like the y in yes (in Colombia)."),
        (r"^h|[^c]h", "h is always silent in Spanish."),
        (r"qu", "qu sounds like k: the u is silent."),
        (r"z|c(?=[ei])", "z, and c before e or i, sound like s in Latin America."),
        (r"v", "v sounds like a soft b."),
        (r"[áéíóú]", "The accent mark shows which syllable is stressed: say that one a little louder."),
    ],
    "fr": [
        (r"ou", "ou sounds like oo in food."),
        (r"(?<![aeo])u(?![nm])", "u is said with lips rounded for oo while saying ee."),
        (r"[aeiou][nm](?![aeiouynm])", "A vowel plus n or m at the end of a syllable is nasal: let the air go through your nose, and don't say the n."),
        (r"r", "The French r is made in the back of the throat, a little like gargling softly."),
        (r"oi", "oi sounds like wa."),
        (r"eau|au", "eau and au sound like oh."),
        (r"ç", "ç sounds like s."),
        (r"^h", "h is silent in French."),
        (r"[tdspxz]$", "A consonant at the end of a word is usually silent."),
        (r"é", "é sounds like ay in day, but short."),
    ],
    "pt": [
        (r"ão", "ão is a nasal owng: let the air go through your nose."),
        (r"ã|õ|[aeiou][mn](?![aeiou])", "The tilde or an m/n after a vowel makes it nasal: air through the nose."),
        (r"lh", "lh sounds like the lli in million."),
        (r"nh", "nh sounds like the ny in canyon."),
        (r"^r|rr", "r at the start of a word, and rr, sound like an English h in Brazil."),
        (r"t(?=i)|te$", "t before an i sound is said ch in most of Brazil."),
        (r"d(?=i)|de$", "d before an i sound is said j in most of Brazil."),
        (r"ç", "ç sounds like s."),
        (r"[áéíóú]", "The accent shows the stressed syllable; é and ó are open, ê and ô are closed."),
    ],
    "it": [
        (r"([bcdfglmnprstvz])\1", "Double consonants are held a little longer: they change the word."),
        (r"c(?=[ei])|ci", "c before e or i sounds like ch in church."),
        (r"ch", "ch sounds like k."),
        (r"g(?=[ei])", "g before e or i sounds like j in jam."),
        (r"gh", "gh sounds like a hard g, as in go."),
        (r"gli", "gli sounds like the lli in million."),
        (r"gn", "gn sounds like the ny in canyon."),
        (r"sc(?=[ei])", "sc before e or i sounds like sh."),
        (r"^h", "h is always silent in Italian."),
        (r"[àèéìòù]", "The accent shows the stressed last syllable: say it a little louder."),
    ],
}

# ---- Day 1: the first class, for someone who knows nothing yet ----
# Steps: {"say": text} the teacher talks; {"show": [...]} big text on the board; "item": a
# course item (its recording); "letters": the alphabet (letter, its name, recorded);
# "tone": a Chinese tone with its pitch chart; "repeat": listen and repeat (never graded).

ALPHABETS = {
    "es": [("A", "a"), ("B", "be"), ("C", "ce"), ("D", "de"), ("E", "e"), ("F", "efe"), ("G", "ge"), ("H", "hache"), ("I", "i"), ("J", "jota"), ("K", "ka"), ("L", "ele"), ("M", "eme"), ("N", "ene"), ("Ñ", "eñe"), ("O", "o"), ("P", "pe"), ("Q", "cu"), ("R", "erre"), ("S", "ese"), ("T", "te"), ("U", "u"), ("V", "uve"), ("W", "uve doble"), ("X", "equis"), ("Y", "ye"), ("Z", "zeta")],
    "fr": [("A", "a"), ("B", "bé"), ("C", "cé"), ("D", "dé"), ("E", "e"), ("F", "effe"), ("G", "gé"), ("H", "hache"), ("I", "i"), ("J", "ji"), ("K", "ka"), ("L", "elle"), ("M", "emme"), ("N", "enne"), ("O", "o"), ("P", "pé"), ("Q", "ku"), ("R", "erre"), ("S", "esse"), ("T", "té"), ("U", "u"), ("V", "vé"), ("W", "double vé"), ("X", "ixe"), ("Y", "i grec"), ("Z", "zède")],
    "pt": [("A", "á"), ("B", "bê"), ("C", "cê"), ("D", "dê"), ("E", "é"), ("F", "efe"), ("G", "gê"), ("H", "agá"), ("I", "i"), ("J", "jota"), ("K", "cá"), ("L", "ele"), ("M", "eme"), ("N", "ene"), ("O", "ó"), ("P", "pê"), ("Q", "quê"), ("R", "erre"), ("S", "esse"), ("T", "tê"), ("U", "u"), ("V", "vê"), ("W", "dáblio"), ("X", "xis"), ("Y", "ípsilon"), ("Z", "zê")],
    "it": [("A", "a"), ("B", "bi"), ("C", "ci"), ("D", "di"), ("E", "e"), ("F", "effe"), ("G", "gi"), ("H", "acca"), ("I", "i"), ("L", "elle"), ("M", "emme"), ("N", "enne"), ("O", "o"), ("P", "pi"), ("Q", "cu"), ("R", "erre"), ("S", "esse"), ("T", "ti"), ("U", "u"), ("V", "vu"), ("Z", "zeta"), ("J", "i lunga"), ("K", "cappa"), ("W", "doppia vu"), ("X", "ics"), ("Y", "ipsilon")],
}

WELCOME = "Welcome to your very first class! I'll assume you know nothing yet, and that's perfect. Nothing is graded today. Just listen, and say each word back to me. Tap Next whenever you're ready, and tap any word to hear it again."

DAY1 = {
    "zh": [
        {"title": "Welcome", "say": WELCOME, "show": ["你好", "nǐ hǎo"]},
        {"title": "What is pinyin?", "say": "Chinese isn't written with letters. It's written with characters, like these. Pinyin spells the sounds of Chinese with the letters you already know, so you can read how a word sounds. For example, hello is written with two characters, and in pinyin it's n i, h a o.", "show": ["你好 = nǐ hǎo"], "item": "nihao"},
        {"title": "The little marks are tones", "say": "See the little marks above the vowels? They're tones. In Chinese, the pitch of your voice is part of the word. The same syllable, ma, means four different things depending on its tone. Let's hear each one.", "show": ["mā  má  mǎ  mà  ma"]},
        {"title": "Tone 1: high and flat", "tone": 1, "item": "ma1", "say": "Tone one is high and flat, like singing one long note. Mā means mom. Listen, then say it back.", "repeat": True},
        {"title": "Tone 2: rising", "tone": 2, "item": "ma2", "say": "Tone two rises, like asking 'what?' in surprise. Má means hemp. Listen, then say it back.", "repeat": True},
        {"title": "Tone 3: dips low", "tone": 3, "item": "ma3", "say": "Tone three dips low, then comes up a little. Keep it low and relaxed. Mǎ means horse.", "repeat": True},
        {"title": "Tone 4: falling", "tone": 4, "item": "ma4", "say": "Tone four falls sharply, like a firm 'No!'. Mà means to scold.", "repeat": True},
        {"title": "The neutral tone", "tone": 5, "item": "mama", "say": "Some syllables are light and short, with no tone mark. That's the neutral tone. In māma, mom, the second ma is light. Listen.", "repeat": True},
        {"title": "How characters work", "say": "Each character is one syllable, and it usually has a meaning. Many characters are built from parts. The character for mom has two parts: woman on the left, and horse on the right. The horse part gives the sound, ma. So mom is the woman word that sounds like ma.", "show": ["妈 = 女 + 马", "mom = woman + horse (sounds like mǎ)"]},
        {"title": "Two third tones", "say": "One more trick. When two third tones come together, the first one rises instead, like tone two. So nǐ hǎo is said ní hǎo. You don't have to think about it: just copy the recording.", "show": ["nǐ hǎo → ní hǎo"], "item": "nihao"},
        {"title": "Your first greeting", "say": "Now your first greeting: nǐ hǎo, hello. Listen, and say it back to me. You just spoke Chinese!", "item": "nihao", "repeat": True},
    ],
    "es": [
        {"title": "Welcome", "say": WELCOME, "show": ["¡Hola!"]},
        {"title": "The alphabet", "say": "Spanish uses the same alphabet as English, plus one extra letter, ñ. Tap any letter to hear its Spanish name.", "letters": True},
        {"title": "Five pure vowels", "say": "Spanish has just five vowel sounds, and they never change. A as in father, E as in bed, I as in see, O as in oh, and U as in food. Keep them short and pure.", "show": ["a  e  i  o  u"], "item": "a"},
        {"title": "Sounds that differ from English", "say": "A few letters sound different from English. H is always silent. J sounds like a strong, breathy h. Ñ sounds like the n y in canyon. And a double r is rolled.", "show": ["h: silent", "j = strong h", "ñ = ny", "rr = rolled"], "item": "nino"},
        {"title": "Accent marks", "say": "The little line over a vowel is an accent mark. It shows which syllable to stress. Papá, with the accent, means dad. It can also tell two words apart: sí with an accent means yes, and si without one means if.", "show": ["papá = dad", "sí = yes · si = if"], "item": "papa"},
        {"title": "Your first greeting", "say": "Now your first greeting: hola, hello. The h is silent, so it sounds like oh-la. Listen, and say it back to me.", "item": "hola", "repeat": True},
    ],
    "fr": [
        {"title": "Welcome", "say": WELCOME, "show": ["Bonjour !"]},
        {"title": "The alphabet", "say": "French uses the same alphabet as English, but the letters have French names. Tap any letter to hear it.", "letters": True},
        {"title": "U and ou", "say": "French has two sounds English mixes up. Ou sounds like oo in food. U is new: round your lips for oo, and say ee. Listen to tu, you, and tout, all.", "show": ["tu ≠ tout"], "item": "tu"},
        {"title": "Nasal vowels", "say": "When a vowel comes before n or m at the end of a syllable, it's nasal: the air goes through your nose and you don't say the n. Listen to bon, good.", "show": ["bon · vin · blanc"], "item": "bon"},
        {"title": "The French r and silent letters", "say": "The French r is made at the back of the throat, a little like gargling softly. And most letters at the end of a word are silent: petit sounds like puh-tee.", "show": ["rouge", "petit → puh-tee"], "item": "rouge"},
        {"title": "Accent marks", "say": "French accents change the sound. É, with an acute accent, sounds like ay in day. È and ê are like e in bed. The little hook under ç makes it sound like s.", "show": ["é = ay", "è ê = eh", "ç = s"], "item": "tres"},
        {"title": "Your first greeting", "say": "Now your first greeting: bonjour, hello. Listen, and say it back to me.", "item": "bonjour", "repeat": True},
    ],
    "pt": [
        {"title": "Welcome", "say": WELCOME, "show": ["Oi!"]},
        {"title": "The alphabet", "say": "Portuguese uses the same alphabet as English, with Portuguese names for the letters. Tap any letter to hear it.", "letters": True},
        {"title": "Open and closed vowels", "say": "Portuguese has open and closed vowels. É with this accent is open, like e in bed. Ê is closed, like ay in they. The accent tells you which one.", "show": ["é = open eh", "ê = closed ay"], "item": "e-open"},
        {"title": "Nasal sounds", "say": "The wavy line over a vowel, called a tilde, makes it nasal: the air goes through your nose. Ão sounds like owng. Listen to pão, bread.", "show": ["ão · ã · im"], "item": "pao"},
        {"title": "Sounds that differ from English", "say": "Lh sounds like the l l i in million. Nh sounds like the n y in canyon. And an r at the start of a word sounds like an English h in Brazil: rato, mouse, sounds like hah-to.", "show": ["lh = lli", "nh = ny", "r = h"], "item": "filho"},
        {"title": "Accent marks", "say": "Accents also show the stressed syllable. Café is stressed on the last syllable because of the accent.", "show": ["café · chá"], "item": "cafe"},
        {"title": "Your first greeting", "say": "Now your first greeting: oi, hi. Listen, and say it back to me.", "item": "oi", "repeat": True},
    ],
    "it": [
        {"title": "Welcome", "say": WELCOME, "show": ["Ciao!"]},
        {"title": "The alphabet", "say": "The Italian alphabet has twenty-one letters. J, K, W, X and Y only appear in foreign words. Tap any letter to hear its Italian name.", "letters": True},
        {"title": "Five pure vowels", "say": "Italian vowels are short and pure, and every one is pronounced. A as in father, E as in bed, I as in see, O as in oh, U as in food.", "show": ["a  e  i  o  u"], "item": "a"},
        {"title": "C and g change before e and i", "say": "Before e or i, c sounds like ch in church, and g like j in jam: ciao. To keep them hard, Italian adds an h: chi, who, sounds like key.", "show": ["ci = chee", "chi = kee"], "item": "ciao"},
        {"title": "Double consonants", "say": "In Italian, a doubled consonant is held a little longer, and it changes the word. Nono is ninth, and nonno is grandpa. Listen to the difference.", "show": ["nono ≠ nonno"], "item": "nonno"},
        {"title": "Accent marks", "say": "Italian writes an accent only on a stressed last syllable, like città, city, or caffè, coffee. H is always silent.", "show": ["città · caffè · perché"], "item": "sci"},
        {"title": "Your first greeting", "say": "Now your first greeting: ciao, hi. Listen, and say it back to me.", "item": "ciao", "repeat": True},
    ],
}

UNIT_INTRO = "Welcome to the class for {title}. I'll show you {n} new words and phrases, one at a time. Listen to each one, look at what it means, and say it out loud. {rule}Nothing here is graded."
RULE_LINE = "Then we'll look at a rule that helps you use them. "
EXTRA_INTRO = {
    "roleplay": "These lines come up in the role-play “{title}”. Hear them now, so you know them before it's your turn.",
    "story": "These words come up in the story “{title}”. Hear them now, so the story is easy to follow.",
    "article": "These words come up in the article “{title}”. Hear them now, so it's easy to read.",
}
DONE_LINE = "That's the class done! Next, practice these words with easy exercises. You won't lose any hearts there."
