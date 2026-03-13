Wie ich mit AI entwickle - Mein Workflow mit Cursor + Claude Opus 4.6


Vorwort

Ich nutze die Cursor IDE mit Claude Opus 4.6 als meine Main AI. Für mich ist die AI kein Tool das einfach Code ausspuckt sondern eher wie ein Pair Programmer mit dem ich zusammenarbeite. Hier zeige ich wie ich das konkret mache, mit echten Beispielen aus meiner täglichen Arbeit.


Mein grundsätzlicher Ansatz

Ich arbeite immer nach dem gleichen Prinzip: erst denken, dann coden. Das heißt ich springe nie direkt in die Implementierung rein sondern lasse mir erstmal einen Plan machen, gehe den durch, und dann arbeiten wir Schritt für Schritt ab.

In Cursor gibt es dafür verschiedene Modi die ich aktiv nutze:

- Plan Mode: Hier darf die AI nur lesen und planen, nichts verändern. Das nutze ich am Anfang von größeren Tasks.
- Agent Mode: Hier darf die AI Code schreiben, Dateien erstellen, Terminal-Befehle ausführen. Das ist der Umsetzungs-Modus.
- Ask Mode: Wenn ich eine Frage habe ohne dass was geändert werden soll.

Mein Workflow ist immer: Plan Mode zuerst -> Plan durchgehen und absegnen -> dann Agent Mode für die Umsetzung.


Wie ich ein Projekt starte

Bevor ich überhaupt die KI anwerfe überlege ich mir erstmal grob was ich bauen will. Ich beschreibe den kompletten Workflow der App einmal durch, so wie ein User sie benutzen würde. Dazu kommen die technischen Anforderungen. Das sieht dann ungefähr so aus:

"ich plane eine webapp mit folgendem user flow: landing page -> registration/login -> dashboard mit workspace-übersicht -> workspace öffnen -> dokumente hochladen oder im chat fragen stellen.

technische anforderungen: next.js 16 app router mit api routes als backend, supabase postgres mit pgvector für vektorspeicherung, supabase auth mit RLS policies für multi-tenancy, typescript strict mode durchgängig, tailwind + shadcn ui als design system, projektstruktur nach feature-folders, clean code prinzipien.

analysiere das und erstelle mir daraus eine strukturierte context-datei die für das gesamte projekt dient. trenne dabei zwischen architektur entscheidungen, tech stack, datenmodell und ui-flow."

Die AI gibt mir dann eine saubere Zusammenfassung zurück. Die nutze ich ab dann als Referenz. Wenn ich dann mit dem Bauen anfange:

"nutze die context datei als architektur- eferenz. implementiere step by step, focus on one task at a time. starte mit dem datenbank schema und double check die foreign key constraints und index-strategie bevor du es final machst"

Das "double check" und "bevor du finalisierst" ist bewusst gewählt. Damit zwinge ich die KI in einen Self Review bevor sie Output liefert.


Beispiel 1: Anforderungsanalyse mit klaren Grenzen

Wenn ich ein neues Projekt starte wie z.B. das RAG Knowledge Hub gebe ich immer die Aufgabenstellung direkt mit und setze klare Constraints:

"wir bauen ein RAG system mit next.js und supabase. hier die aufgabenstellung: [text].

vorgaben: wir nutzen nur claude für generation, kein openai. embeddings müssen lokal laufen ohne externen api key. das system muss multi-tenant fähig sein über workspaces.

analysiere die anforderungen und erstell einen implementierungsplan. pro schritt will ich wissen: was wird gebaut, welche abhängigkeiten gibt es zum vorherigen schritt, und welche trade offs stecken drin."

Ich definiere also nicht nur was ich will sondern auch die Grenzen. Das verhindert dass die AI Lösungen vorschlägt die für mich nicht funktionieren. Wenn mir dann am Plan was nicht passt:

"punkt 3 setzt openai voraus, das widerspricht unseren vorgaben. evaluiere alternativen: lokale transformer modelle vs. cloud embedding apis mit free tier. vergleich nach kosten, latenz und embedding qualität."


Beispiel 2: Isolierte Task Umsetzung

Ich arbeite nie an allem gleichzeitig. Immer ein Task nach dem anderen. Wenn der Plan steht:

"plan ist approved. starte mit task 1: datenbank schema. scope: nur die tables, indexes und RLS policies. keine api routes, kein frontend."

Wenn das fertig ist:

"schema passt. weiter mit task 2: api routes für document CRUD und die ingestion pipeline."

Das ist wichtig weil wenn du der KI sagst "bau alles auf einmal" dann macht sie Fehler, vergisst Sachen oder die Teile passen nicht zusammen. Lieber klein und kontrolliert.


Beispiel 3: Kontext über @-Referenzen

In Cursor kann ich mit @ Dateien und Ordner referenzieren. Das nutze ich ständig um der KI präzisen Kontext zu geben statt vage zu beschreiben:

"analysiere @src/lib/rag/chunker ist das sinnvoll für einen RAG use case mit technischen dokumenten? oder verlieren wir bei 500 zu viel kontext pro chunk?"

oder bei einem Bug mit dem relevanten File direkt dabei:

"runtime error in @src/components/layout/header.tsx zeile 64: 'MenuGroupRootContext is missing'. der fehler kommt beim klick auf das profil-dropdown. das passiert seit dem switch von radix zu base-ui. prüfe ob die component hierarchy stimmt."

Je spezifischer der Kontext desto weniger halluziniert die KI eine Lösung die am Problem vorbeigeht.


Beispiel 4: UI/UX Feedback mit Screenshots

Wenn die UI nicht passt mache ich einen Screenshot und beschreibe das Problem aus User Perspektive. Ich sage nicht welche CSS oder SCCS Klasse geändert werden soll sondern was das UX Problem ist:

"die chat page hat layout probleme: input feld wird am rechten rand abgeschnitten, die message bubbles alignen nicht korrekt, und der gesamte container nutzt nicht die volle verfügbare höhe. außerdem fehlt cursor:pointer auf interaktiven elementen. schau dir den screenshot an und fix die responsive issues"

oder

"die document cards brechen den text nach 3 wörtern um weil sie in einem zu engen grid sitzen. refactor zu einer horizontalen liste mit icon, title, preview text und actions in einer zeile. das skaliert besser bei langen dokumenttiteln"

Die KI versteht dann selbst was technisch geändert werden muss. Ich gebe die Design Richtung vor, nicht die Implementation.


Beispiel 5: Debugging mit vollständigem Kontext

Wenn ein Error kommt liefere ich immer die komplette Fehlermeldung plus den Kontext wann und wo er auftritt:

"Console Error beim klick auf 'Seed Demo Data':
Seed failed: Could not locate file: https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/default/tokenizer.json

der request geht an /api/seed, das ruft @src/lib/seed/index.ts auf...

Je mehr Kontext beim Error desto schneller die Lösung. Nur den Error Text alleine reicht manchmal nicht weil die AI dann raten muss wo im Code das Problem liegt.


Beispiel 6: Architektur Entscheidungen diskutieren

Ich nutze die KI um technische Entscheidungen abzuwägen. Nicht einfach "mach mal" sondern ich stelle konkrete Alternativen gegenüber:

"wir brauchen embeddings aber ich hab keinen openai key.
1. lokales ONNX modell via transformers.js (kein api key, aber größere bundle size)
2. voyage ai (anthropic partner, free tier, aber externe dependency)
welche option passt am besten für ein demo projekt wo setup einfachheit wichtig ist?"

oder wenn ich unsicher bin ob die Richtung stimmt:

"hier ist die originalaufgabe: [text]. wir haben jetzt einen RAG chatbot mit workspace-isolation und source citations gebaut. analysiere ob unser ansatz alle pflicht-anforderungen abdeckt sind"


Beispiel 7: Quality Gate vor Abgabe

Bevor ein Feature oder Projekt fertig ist lasse ich einen systematischen Review machen:

"das projekt ist feature complete. hier nochmal die original aufgabenstellung [text]

mach einen vollständigen abgleich:
- welche pflicht anforderungen sind erfüllt, welche fehlen?
- ist die README aktuell und deckt sie architektur ab?
- gibt es code ohne dokumentation der kommentare braucht?
- laufen die unit tests durch?
- sind umgebungsvariablen korrekt in .env.example dokumentiert?"

Für Tests sage ich gezielt was getestet werden soll

Beispiel 8: Reactivity und State Probleme

Bei State-Management-Problemen beschreibe ich das erwartete vs. tatsächliche Verhalten:

"expected: nach klick auf 'seed demo data' erscheint der neue workspace sofort in der liste und in der sidebar.
actual: workspace erscheint erst nach manuellem page refresh.
das betrifft auch create und delete  generell aktualisiert sich das UI nie automatisch nach mutations.

vermutung: entweder cached der browser die fetch responses, oder die sidebar hat einen eigenen state der nicht gesynct wird. analysiere den data flow und implementiere einen sauberen refresh mechanismus."

Ich trenne bewusst zwischen Beobachtung und Vermutung. So kann die AI meine Hypothese prüfen statt sie blind umzusetzen.


Was ich gelernt habe

Context Management ist der wichtigste Skill. Je präziser der Kontext desto besser die Antworten. Dateien mit @ referenzieren, Error Messages komplett kopieren, Screenshots anhängen, und am Anfang eine Context Datei erstellen die als Architektur Referenz dient.

Task Isolation. Ein Task nach dem anderen, nie alles gleichzeitig. "focus on one task at a time" ist mein meistgenutzter Satz. Das reduziert Fehler und macht den Output reviewbar.

Plan before Execute. Bei größeren Sachen immer erst im Plan Mode planen lassen bevor Code geschrieben wird. Spart am Ende viel Zeit weil Architektur Fehler früh auffallen statt erst bei der Integration.

Self- eview erzwingen. "double check" und "bevor du finalisierst" zwingen die AI in einen zweiten Durchgang. Das fängt logische Fehler ab die beim ersten Durchlauf durchrutschen.

Klare Grenzen setzen. Immer klar sagen was NICHT gemacht werden soll oder welche Vorgaben gelten. "kein openai", "nur das schema, nichts anderes", "keine externen dependencies". Das hält die AI fokussiert.

Nicht blind vertrauen. Code immer durchlesen und testen. Die KI macht Fehler besonders bei komplexeren State Management Flows oder wenn der Kontext zu groß wird. Unit Tests helfen dabei Fehler früh zu finden.
