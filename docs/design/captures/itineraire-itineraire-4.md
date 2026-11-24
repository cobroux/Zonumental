# Itinéraire itineraire-4 : écart au tracé à 390 px

Capture : itineraire-itineraire-4-390.png (API simulée, position simulée à ~1 km du tracé via `context.setGeolocation`, `CAPTURE=1 PORT=4314 npx playwright test itineraire`). Axe WCAG 2.2 AA : 0 violation.

Écarts à valider par `ux-designer` :
1. Pas de maquette : ligne `.ecart` (texte 0,875 rem, encre) + bouton « Recalculer » (pilule 44 px, style `.action` existant) sous le résumé. Aucun nouveau token.
2. Annonce « Tu t'es écarté de l'itinéraire » dans un `<p role="status">` toujours présent (vide hors écart) : annonce polie, pas d'aria-live agressif ni de déplacement de focus.
3. Seuils 50 m (écart) / 40 m (retour) : hystérésis, valeurs provisoires ; lectures de précision > 50 m ignorées.
4. `carte.css` : 6,78 ko (budget d'avertissement 6 ko déjà dépassé en itineraire-3).
