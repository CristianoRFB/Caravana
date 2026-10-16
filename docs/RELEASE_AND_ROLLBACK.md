# Release e rollback — somente plano

Nenhum deploy autorizado. Production 4d069e0a e Previews a2c5e89c/0141fb45 preservados por captura de assets. Rollback futuro requer comparar frontend, regras e dados: rollback de frontend não desfaz schema ou dados.

Para recuperação local, repository.bundle e source-and-dist.zip guardam Git e fonte avançada anteriores ao trabalho. Restaurar em pasta nova, validar SHA256 do container e de cada arquivo em manifest.json; aplicar patches somente sobre sua base registrada. Não extrair sobre o checkout original sujo.

Antes de release real: backup autorizado de regras e dados, staging exclusivo, testes de restore, diff e matriz de gates, plano canário, autorização explícita e smoke. Nunca publicar de branch/main sem comprovar paridade com financeiro.
