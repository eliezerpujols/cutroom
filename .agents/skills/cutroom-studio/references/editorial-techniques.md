# Técnicas editoriales para componentes editables

Usar cuando un montaje de Cutroom pide profundidad, tracking, demostraciones de producto o una dirección visual nueva. Esta guía adapta principios de la skill MIT [Heditor](https://github.com/pycodebr/heditor), consultada en su versión 2.20.0. Es una referencia técnica; no cambia el editor ni el tipo de entrega elegido por el usuario.

## Traducir la idea al timeline

Cuando se solicitan componentes Studio editables, construirlos en Remotion, registrarlos e insertarlos como clips nativos. Conservar video, recorte, subtítulos, música y efectos de sonido en capas independientes. Un render de revisión es adicional al proyecto editable. Un MP4 completo importado no sustituye esas capas.

Asignar a cada recurso un momento del argumento. Una transformación visual debe terminar cuando comunica su idea; repetir el mismo motivo en otras frases necesita una razón narrativa. En Reel 11, la preferencia del usuario fue perfiles que aparecen, X que descartan algunos y un grupo que queda solo en la apertura. Esto es una decisión de ese reel, no una receta universal. Omitir barras de progreso decorativas si no explican nada.

## Profundidad y tracking

Orden útil: subtítulos → elementos en primer plano → recorte de persona → Studio detrás de ella → toma original. El recorte y la toma conservan el mismo sourceIn, rate, duración y tracking durante sus intervalos compartidos. Los PNG transparentes nativos son el recurso de exportación, no un WebM que se reproduzca por su cuenta. Reutilizar tracking medido; no presentar posiciones inventadas como seguimiento real.

Para un cambio de encuadre, cortar clips y configurar su transformación nativa. Para un elemento detrás de ella, elegir coordenadas y tamaños que la silueta oculte de forma convincente. Probar cabello, manos y hombros durante reproducción real. Al cambiar de escena, completar las salidas antes de mezclar posiciones incompatibles del recorte.

## Tiempo, texto y producto

Derivar las animaciones del frame local: entrada → acción sobre la palabra → reposo → salida. Una X puede dibujarse antes de que el perfil desaparezca, mientras los restantes mantienen su posición. Probar saltos y reproducción consecutiva; trim/split deben conservar la fase.

Si los subtítulos muestran una frase, enfatizar dentro de esa misma capa. No añadir simultáneamente otro título con la misma frase. La interfaz del producto puede tener su propio texto funcional. Usar pantallas de la aplicación real y su idioma solicitado; los datos ficticios de demostración deben quedar documentados como tales.

## Componentes disponibles

- `community-selection`: cantidad total, perfiles que permanecen, frame de las X, frame de descarte y tres colores. La salida se maneja con duración y Effects del clip.
- `creator-program-screen`: pantalla `inicio`, `editor` u `oferta`, frames de entrada, giro, toque opcional y color. Capturas reales de Creator Program en español con datos de ejemplo, incluidas en la aplicación. Son capturas, no controles funcionales de Creator Program ni contenido editable dentro de cada captura.

Mover, escalar, recortar y ordenar desde los controles compartidos. Probar un cambio de propiedad, guardado, deshacer y reapertura. Exportar mediante la composición de producción de Cutroom y revisar fotogramas de la entrada, acción y salida antes de entregar.

## Demo continuo reutilizable

Antes de volver a dibujar un producto, buscar la composición y las fotos del demo creado previamente. `product-flow-demo-es` adapta el demo inglés de Reel 4 a español con las mismas seis fotos. El clip contiene un flujo continuo de 438 frames, con ritmo editable (0,5–2×) y final sostenido al extenderlo; es una plantilla Studio, no el video completo de un reel. Se posiciona con los controles compartidos. Colocarlo debajo del recorte de la persona para que funcione como fondo.

`communication-beat` aporta recursos sin texto de voz: `aviso`, `silencio`, `pregunta`, `confianza`, `videos`. En la revisión v05 de Reel 11, el usuario pidió un cambio visual cada tres segundos entre 3 y 21. La secuencia usa recursos diferentes en 3, 6, 9, 12, 15 y 18; los subtítulos por sí solos no cumplen ese cambio visual. La multitud con X sigue limitada a la apertura.
