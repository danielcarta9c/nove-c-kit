# HANDOFF — &lt;NOME_PROGETTO&gt; sessione &lt;DATA&gt;

> Documento di **chiusura sessione** quando il contesto si satura.
> Va letto come PRIMA cosa quando riprendi nel prossimo turno (o un nuovo
> Claude entra in scena), sopra a `PROJECT_STATE.md`.
>
> **Quando scriverlo**: appena vedi i sintomi di contesto saturo — tool che
> non si caricano, errori su operazioni semplici, ripetizioni di domande
> già risposte. A quel punto NON iniziare nuovi blocchi: consegna qui e
> fermati. Vedi PLAYBOOK §32.5.

## Stato attuale

3-5 righe. Dove siamo arrivati, cosa funziona end-to-end, cosa no.

## Lavori aperti

Per ciascuno, col dettaglio tecnico per riprenderli senza ri-scoprire il
contesto:

- **&lt;Nome lavoro&gt;**: cosa serve fare + perché + dove vive nel codice
  (`path/file:riga`) + cosa NON è ancora stato fatto + perché.

## Cosa NON rifare

Insidie e strade morte già esplorate (l'equivalente delle "cose da non
provare di nuovo"). Una riga per ciascuna, in modo che il prossimo Claude
non perda ore ripetendole:

- &lt;cosa è stato provato&gt; → &lt;perché non funziona&gt; → &lt;cosa fare invece&gt;

## Profilo del PM — residuo della sessione

Cosa hai imparato in questa sessione che vale per le prossime: lessico
preferito, soglie di autonomia confermate o riviste rispetto al `CLAUDE.md`,
modi di porre le domande che hanno funzionato. Vedi PLAYBOOK §36.

## Riferimenti

- Commit principali della sessione: &lt;hash&gt; &lt;hash&gt; ...
- PR aperte / mergiate: #N, #N+1
- ADR nuovi: `docs/adr/000N-*.md`
- File doc toccati: ...
