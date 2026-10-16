# Decisões

## ADR-001 — Recuperar a fonte editável e preservar todos os artefatos

Base Git oficial fa4d138 + fonte avançada local rastreada por manifestos. Primeiro reproduzir produção sem alterações funcionais; depois portar o fix de ID para ambas as escritas da reserva. Não usar os ZIPs minificados como src nem publicar o dist de main.

## ADR-002 — Isolamento de desenvolvimento

Worktree gerida separada, branch codex/caravana77-commercial-v1-20261016. Backup da fonte e dist fora do checkout. Segredos continuam ignorados. Testes exclusivamente em emuladores/dados sintéticos. Produção, Auth, Rules remotas e dados reais sem mutações.

## ADR-003 — Storage legado

O arquivo storage.rules de main será preservado como evidência legada na recuperação, mesmo que a configuração avançada use comprovantes inline em Firestore. Não inferir migração ou ausência de objetos de Storage reais. Policy definitiva e Rules implantadas dependem de auditoria autorizada.
