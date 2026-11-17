## Fonte de conteúdo

O controle busca `index.html` da mesma origem logo ao abrir e extrai os mesmos títulos, textos e notas usados pelo apresentador. Isso evita duas cópias editáveis do conteúdo. A consulta local funciona depois desse carregamento mesmo que o pareamento falhe ou a rede caia. Sem carregar a própria página e o HTML da apresentação ao menos uma vez, não há conteúdo local disponível.

## Estado de navegação

Enquanto desconectado, anterior, próximo e ir para slide mudam apenas a leitura local. O último índice recebido da apresentação é usado como ponto inicial se houver uma desconexão após pareamento. A leitura local é identificada como tal e nunca é apresentada como estado atual confirmado da projeção. Quando chega um novo estado válido pela conexão restabelecida, ele substitui imediatamente a consulta local; não se envia retroativamente a navegação feita offline.
