# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-tools.spec.ts >> Premium reuses templates, reverses tasks, archives and retains history with an accessible mobile menu
- Location: e2e\functional-tools.spec.ts:23:1

# Error details

```
Test timeout of 45000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - button "Menu" [ref=e6] [cursor=pointer]
    - link "caravana77" [ref=e8] [cursor=pointer]:
      - /url: /
    - generic [ref=e15]:
      - generic [ref=e16]: admin-a@example.test
      - button "Sair" [ref=e17] [cursor=pointer]
  - complementary [ref=e21]:
    - generic [ref=e22]: ESPAÇO DA ORGANIZAÇÃO
    - link "▦ Visão geral" [ref=e23] [cursor=pointer]:
      - /url: /admin
      - generic [ref=e24]: ▦
      - text: Visão geral
    - link "◫ Caravanas" [ref=e25] [cursor=pointer]:
      - /url: /admin/caravanas
      - generic [ref=e26]: ◫
      - text: Caravanas
    - link "Financeiro" [ref=e27] [cursor=pointer]:
      - /url: /admin/financeiro
    - link "▤ Comprovantes" [ref=e33] [cursor=pointer]:
      - /url: /admin/comprovantes
      - generic [ref=e34]: ▤
      - text: Comprovantes
    - link "✓ Check-in" [ref=e35] [cursor=pointer]:
      - /url: /admin/check-in
      - generic [ref=e36]: ✓
      - text: Check-in
    - link "? Suporte" [ref=e37] [cursor=pointer]:
      - /url: /admin/suporte
      - generic [ref=e38]: "?"
      - text: Suporte
    - link "◈ Identidade pública" [ref=e39] [cursor=pointer]:
      - /url: /admin/identidade
      - generic [ref=e40]: ◈
      - text: Identidade pública
    - link "▤ Documentos e prazos" [ref=e41] [cursor=pointer]:
      - /url: /admin/documentos
      - generic [ref=e42]: ▤
      - text: Documentos e prazos
    - link "◇ Plano e limites" [ref=e43] [cursor=pointer]:
      - /url: /admin/plano
      - generic [ref=e44]: ◇
      - text: Plano e limites
    - link "♧ Equipe e convites" [ref=e45] [cursor=pointer]:
      - /url: /admin/equipe
      - generic [ref=e46]: ♧
      - text: Equipe e convites
    - link "Relatórios" [ref=e47] [cursor=pointer]:
      - /url: /admin/relatorios
      - generic [aria-hidden] [ref=e48]: ▥
      - text: Relatórios
    - link "Roteiros da equipe" [ref=e49] [cursor=pointer]:
      - /url: /admin/roteiros
      - generic [aria-hidden] [ref=e50]: ☷
      - text: Roteiros da equipe
    - generic [ref=e51]: Dados protegidos por organização
  - main [ref=e55]:
    - generic [ref=e56]:
      - generic [ref=e57]:
        - generic [ref=e58]: PAINEL DA ORGANIZAÇÃO
        - heading "Visão geral" [level=1] [ref=e59]
        - paragraph [ref=e60]: Um panorama claro para a próxima viagem.
      - link "＋ Nova caravana" [ref=e61] [cursor=pointer]:
        - /url: /admin/caravanas
        - generic [ref=e62]: ＋
        - text: Nova caravana
    - generic [ref=e63]:
      - text: Caravana
      - combobox "Caravana" [ref=e64]:
        - option "Caravana Sintética ride-a" [selected]
        - option "Caravana Sintética ride-a2"
    - generic [ref=e65]:
      - generic [ref=e66]:
        - generic [ref=e73]: Vagas totais
        - strong [ref=e74]: "25"
      - generic [ref=e75]:
        - generic [ref=e79]: Inscritos
        - strong [ref=e80]: "1"
      - generic [ref=e81]:
        - generic [ref=e86]: Confirmados
        - strong [ref=e87]: "1"
      - generic [ref=e88]:
        - generic [ref=e93]: Aguardando pagamento
        - strong [ref=e94]: "0"
      - generic [ref=e95]:
        - generic [ref=e101]: Aguardando análise
        - strong [ref=e102]: "0"
      - generic [ref=e103]:
        - generic [ref=e108]: Menores sem autorização aprovada
        - strong [ref=e109]: "0"
      - generic [ref=e110]:
        - generic [ref=e116]: Embarcados
        - strong [ref=e117]: "0"
      - generic [ref=e118]:
        - generic [ref=e122]: Vagas restantes
        - strong [ref=e123]: "24"
        - generic [ref=e124]: de 25 lugares
    - generic [ref=e125]:
      - generic [ref=e126]:
        - generic [ref=e127]:
          - heading "Inscrições recentes" [level=2] [ref=e128]
          - paragraph [ref=e129]: Caravana Sintética ride-a
        - link "Ver passageiros" [ref=e130] [cursor=pointer]:
          - /url: /admin/caravanas/ride-a/passageiros
      - table [ref=e134]:
        - rowgroup [ref=e135]:
          - row [ref=e136]:
            - columnheader "PASSAGEIRO" [ref=e137]
            - columnheader "EMBARQUE" [ref=e138]
            - columnheader "PAGAMENTO" [ref=e139]
            - columnheader "STATUS" [ref=e140]
        - rowgroup [ref=e141]:
          - row [ref=e142]:
            - cell "Pessoa Sintética ride-a 11900000000" [ref=e143]:
              - strong [ref=e144]: Pessoa Sintética ride-a
              - generic [ref=e145]: "11900000000"
            - cell "Terminal fictício" [ref=e146]
            - cell "R$ 85,00" [ref=e147]
            - cell "Aprovado" [ref=e148]
```