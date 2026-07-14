# Umbral — Atlas de lo invisible

Una experiencia web generativa diseñada para abrirse desde una tarjeta NFC. Explora conciencia, física, astronomía y presencia mediante tipografía editorial, partículas Canvas, escultura ASCII 3D y sonido sintetizado en el navegador.

El recorrido principal narra una historia posible de la filosofía en ocho escenas. La misma nube de partículas se transforma con cada época —mito, India/China/Grecia, Sócrates, la caverna, el viaje de las ideas, la duda moderna, la libertad y el presente— para que el visual explique junto con el texto.

Los renderizadores se activan únicamente cuando son visibles. En pantallas pequeñas o dispositivos con menos núcleos reducen automáticamente la densidad de partículas y la resolución interna para preservar un desplazamiento fluido.

## Abrir localmente

No requiere instalación. Puedes abrir `index.html` directamente o servir la carpeta con cualquier servidor estático:

```powershell
python -m http.server 4173
```

Después visita `http://localhost:4173`.

## Publicar y usar con NFC

1. Publica estos archivos en un host estático como Cloudflare Pages, Netlify, Vercel o GitHub Pages.
2. Copia la URL pública HTTPS.
3. Escribe en la tarjeta NFC un registro **URL/URI (NDEF)** con esa dirección.
4. Bloquea la escritura de la tarjeta solo después de probarla en iOS y Android.

La experiencia es responsive, respeta `prefers-reduced-motion` y el sonido permanece desactivado hasta que la persona lo habilita.
