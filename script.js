// Configuração da API SheetDB
const SHEETDB_URL = "https://sheetdb.io/api/v1/in9wws1z72a7q";

// Código secreto de segurança exigido no cadastro / primeiro acesso
const CODIGO_SEGURANCA_ESTABELECIDO = "07072023";

// Estado da Sessão Atual e Item sob Edição
let usuarioAtual = null;
let itemEmEdicao = null;

// Passo 1: Autenticação Inicial ou Redirecionamento para Criação de Conta
function tentarLoginDireto(event) {
  if (event) event.preventDefault();

  const usuarioInput = document.getElementById("usr-field").value.trim();
  const senhaInput = document.getElementById("pwd-field").value.trim();

  if (!usuarioInput || !senhaInput) {
    alert("Por favor, preencha o utilizador e a palavra-passe.");
    return;
  }

  // FLUXO DE CRIAR CONTA: Se digitar @Thales e @Thales2026!
  if (usuarioInput === "@Thales" && senhaInput === "@Thales2026!") {
    usuarioAtual = {
      usuario: "@Thales_TEMP",
      isNovoCadastro: true
    };
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("security-code-modal").style.display = "flex";
    return;
  }

  // FLUXO DE LOGIN NORMAL
  fetch(`${SHEETDB_URL}?sheet=usuarios`)
    .then(res => res.json())
    .then(usuarios => {
      const encontrou = usuarios.find(u => u.usuario === usuarioInput && u.senha === senhaInput);

      if (encontrou) {
        usuarioAtual = encontrou;
        document.getElementById("login-modal").style.display = "none";

        const ehPrimeiroAcesso = String(usuarioAtual.primeiro_acesso).toLowerCase() === "true";

        if (ehPrimeiroAcesso) {
          document.getElementById("security-code-modal").style.display = "flex";
        } else {
          iniciarSessao();
        }
      } else {
        alert("Utilizador ou palavra-passe incorretos. Tente novamente ou use as credenciais de primeiro acesso.");
      }
    })
    .catch(err => {
      console.error("Erro ao autenticar:", err);
      alert("Erro de comunicação com o servidor ou credenciais inválidas.");
    });
}

// Passo 2: Validar o Código de Segurança inserido
function validarCodigoSeguranca(event) {
  if (event) event.preventDefault();
  const codigoInput = document.getElementById("sec-code-field").value.trim();

  if (codigoInput === CODIGO_SEGURANCA_ESTABELECIDO) {
    document.getElementById("security-code-modal").style.display = "none";
    document.getElementById("first-access-modal").style.display = "flex";
  } else {
    alert("Código de segurança incorreto! Acesso negado.");
    document.getElementById("sec-code-field").value = "";
  }
}

// Passo 3: Definir Novo Utilizador e Palavra-passe
function salvarNovaCredencial(event) {
  if (event) event.preventDefault();
  const novoUsuario = document.getElementById("new-usr-field").value.trim();
  const novaSenha = document.getElementById("new-pwd-field").value.trim();

  if (!novoUsuario || !novaSenha) {
    alert("Por favor, preencha o utilizador e a nova palavra-passe.");
    return;
  }

  // Se for uma conta totalmente nova criada via @Thales e @Thales2026!
  if (usuarioAtual && usuarioAtual.isNovoCadastro) {
    const payloadNovo = {
      data: {
        usuario: novoUsuario,
        senha: novaSenha,
        nome: novoUsuario,
        primeiro_acesso: "false",
        permissao: "admin"
      }
    };

    fetch(`${SHEETDB_URL}?sheet=usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadNovo)
    })
    .then(() => {
      usuarioAtual = {
        usuario: novoUsuario,
        nome: novoUsuario,
        primeiro_acesso: "false",
        permissao: "admin"
      };
      document.getElementById("first-access-modal").style.display = "none";
      alert("Conta criada com sucesso!");
      iniciarSessao();
    })
    .catch(err => console.error("Erro ao cadastrar novo utilizador:", err));

  } else {
    // Atualização de credencial para conta já pré-existente
    fetch(`${SHEETDB_URL}/usuario/${usuarioAtual.usuario}?sheet=usuarios`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          usuario: novoUsuario,
          senha: novaSenha,
          nome: novoUsuario,
          primeiro_acesso: "false",
          permissao: "admin"
        }
      })
    })
    .then(() => {
      usuarioAtual.usuario = novoUsuario;
      usuarioAtual.nome = novoUsuario;
      usuarioAtual.primeiro_acesso = "false";
      usuarioAtual.permissao = "admin";
      document.getElementById("first-access-modal").style.display = "none";
      iniciarSessao();
    })
    .catch(err => console.error("Erro ao atualizar credenciais:", err));
  }
}

// Iniciar Aplicação
function iniciarSessao() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("security-code-modal").style.display = "none";
  document.getElementById("first-access-modal").style.display = "none";
  document.getElementById("app-container").style.display = "block";

  document.getElementById("logged-user-name").textContent = usuarioAtual.nome || usuarioAtual.usuario;
  document.getElementById("logged-user-role").textContent = "Administrador";

  carregarItens();
  carregarHistorico();
}

function logout() {
  usuarioAtual = null;
  document.getElementById("app-container").style.display = "none";
  document.getElementById("login-modal").style.display = "flex";
  document.getElementById("usr-field").value = "";
  document.getElementById("pwd-field").value = "";
  document.getElementById("sec-code-field").value = "";
}

// Controle de Abas
function mudarAba(aba) {
  const visaoInv = document.getElementById("visao-inventario");
  const visaoHist = document.getElementById("visao-historico");
  const btnInv = document.getElementById("tab-inv-btn");
  const btnHist = document.getElementById("tab-hist-btn");

  if (aba === "inventario") {
    visaoInv.style.display = "block";
    visaoHist.style.display = "none";
    btnInv.classList.add("active");
    btnHist.classList.remove("active");
  } else {
    visaoInv.style.display = "none";
    visaoHist.style.display = "block";
    btnInv.classList.remove("active");
    btnHist.classList.add("active");
    carregarHistorico();
  }
}

// Carregar Inventário
function carregarItens() {
  fetch(SHEETDB_URL)
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById("inventory-body");
      tbody.innerHTML = "";
      
      let itensTotais = {};

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const nomeChave = (item.nome || "").trim().toLowerCase();
          const qtdParcial = parseInt(item.quantidade || 0);
          const qtdEstoqueTotal = parseInt(item.quantidade_estoque || 0);
          const statusItem = (item.status || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          if (!nomeChave) return;

          if (!itensTotais[nomeChave]) {
            itensTotais[nomeChave] = {
              somaOcupada: 0,
              estoqueTotal: qtdEstoqueTotal
            };
          }

          if (!statusItem.includes("disponivel")) {
            itensTotais[nomeChave].somaOcupada += qtdParcial;
          }

          if (qtdEstoqueTotal > 0) {
            itensTotais[nomeChave].estoqueTotal = qtdEstoqueTotal;
          }
        });
      }

      let itensCriticos = [];

      Object.keys(itensTotais).forEach(chave => {
        const info = itensTotais[chave];
        const disponivelReal = info.estoqueTotal - info.somaOcupada;
        
        if (disponivelReal <= 5) {
          itensCriticos.push(chave);
        }
      });

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const nomeChave = (item.nome || "").trim().toLowerCase();
          const ehCritico = itensCriticos.includes(nomeChave);

          const tr = document.createElement("tr");
          if (ehCritico) tr.classList.add("linha-critica");

          const botaoRemover = `<button class="btn-remover" onclick="removerItem('${item.id}', '${escapeHtml(item.nome)}')">Remover</button>`;

          tr.innerHTML = `
            <td>${item.nome || ""} ${ehCritico ? '<span class="badge-critico">Crítico</span>' : ''}</td>
            <td>${item.marca || ""}</td>
            <td>${item.modelo || ""}</td>
            <td>${item.quantidade || "0"}</td>
            <td>${item.quantidade_estoque || "0"}</td>
            <td>${item.status || ""}</td>
            <td>${item.responsavel || ""}</td>
            <td>${item.data || ""}</td>
            <td>${item.hora || ""}</td>
            <td class="col-acoes">
              <button class="btn-editar" onclick="prepararEdicao('${item.id}', '${escapeHtml(item.nome)}', '${escapeHtml(item.marca)}', '${escapeHtml(item.modelo)}', '${item.quantidade}', '${item.quantidade_estoque}', '${item.status}', '${escapeHtml(item.responsavel)}')">Editar</button>
              ${botaoRemover}
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      const alertaDiv = document.getElementById("alerta-estoque");
      if (itensCriticos.length > 0) {
        alertaDiv.style.display = "block";
        alertaDiv.innerHTML = `⚠️ <strong>Atenção! Existem produtos com o estoque disponível no limite crítico.</strong>`;
      } else {
        alertaDiv.style.display = "none";
      }

      filtrarTabela();
    })
    .catch(error => console.error("Erro ao carregar inventário:", error));
}

// Gravar Histórico
function registrarHistorico(acao, nomeItem, detalhes) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR");
  const horaFormatada = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const registro = {
    data: {
      id: Date.now().toString().slice(-6),
      usuario: usuarioAtual ? usuarioAtual.nome || usuarioAtual.usuario : "Sistema",
      acao: acao,
      item: nomeItem,
      detalhes: detalhes,
      data: dataFormatada,
      hora: horaFormatada
    }
  };

  fetch(`${SHEETDB_URL}?sheet=historico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registro)
  }).catch(err => console.error("Erro ao gravar histórico:", err));
}

// Carregar Histórico
function carregarHistorico() {
  fetch(`${SHEETDB_URL}?sheet=historico`)
    .then(res => res.json())
    .then(dados => {
      const tbody = document.getElementById("history-body");
      tbody.innerHTML = "";

      if (Array.isArray(dados)) {
        dados.reverse().forEach(h => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${h.data || ""} ${h.hora || ""}</td>
            <td><strong>${h.usuario || ""}</strong></td>
            <td>${h.acao || ""}</td>
            <td>${h.item || ""}</td>
            <td>${h.detalhes || ""}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      filtrarHistorico();
    })
    .catch(err => console.error("Erro ao carregar histórico:", err));
}

// Preparar Edição
function prepararEdicao(id, nome, marca, modelo, quantidade, quantidadeEstoque, status, responsavel) {
  itemEmEdicao = {
    id: String(id),
    nome: String(nome || "").trim(),
    marca: String(marca !== 'undefined' ? marca : "").trim(),
    modelo: String(modelo !== 'undefined' ? modelo : "").trim(),
    quantidade: String(quantidade || "0").trim(),
    quantidade_estoque: String(quantidadeEstoque !== 'undefined' ? quantidadeEstoque : '0').trim(),
    status: String(status || "").trim(),
    responsavel: String(responsavel || "").trim()
  };

  document.getElementById("item-id").value = id;
  document.getElementById("nome").value = itemEmEdicao.nome;
  document.getElementById("marca").value = itemEmEdicao.marca;
  document.getElementById("modelo").value = itemEmEdicao.modelo;
  document.getElementById("quantidade").value = itemEmEdicao.quantidade;
  document.getElementById("quantidade_estoque").value = itemEmEdicao.quantidade_estoque;
  document.getElementById("status").value = itemEmEdicao.status;
  document.getElementById("responsavel").value = itemEmEdicao.responsavel;

  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Atualizar";
  btnSubmit.style.backgroundColor = "#ffc107";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Salvar ou Editar Item
function salvarItem(event) {
  if (event) event.preventDefault();

  const idExistente = document.getElementById("item-id").value;
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const quantidade = document.getElementById("quantidade").value.trim();
  const quantidadeEstoque = document.getElementById("quantidade_estoque").value.trim();
  const status = document.getElementById("status").value.trim();
  const responsavel = document.getElementById("responsavel").value.trim();

  const agora = new Date();
  const dataAtual = agora.toLocaleDateString('pt-BR');
  const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const itemPayload = {
    data: {
      nome, marca, modelo, quantidade,
      quantidade_estoque: quantidadeEstoque,
      status, responsavel,
      data: dataAtual, hora: horaAtual
    }
  };

  if (idExistente) {
    let alteracoes = [];

    if (itemEmEdicao) {
      if (itemEmEdicao.status !== status) alteracoes.push(`Status: ${itemEmEdicao.status} ➔ ${status}`);
      if (itemEmEdicao.quantidade !== quantidade) alteracoes.push(`Qtd: ${itemEmEdicao.quantidade} ➔ ${quantidade}`);
      if (itemEmEdicao.quantidade_estoque !== quantidadeEstoque) alteracoes.push(`Estoque: ${itemEmEdicao.quantidade_estoque} ➔ ${quantidadeEstoque}`);
      if (itemEmEdicao.responsavel !== responsavel) alteracoes.push(`Resp: ${itemEmEdicao.responsavel} ➔ ${responsavel}`);
      if (itemEmEdicao.nome !== nome) alteracoes.push(`Nome: ${itemEmEdicao.nome} ➔ ${nome}`);
      if (itemEmEdicao.marca !== marca) alteracoes.push(`Marca: ${itemEmEdicao.marca} ➔ ${marca}`);
      if (itemEmEdicao.modelo !== modelo) alteracoes.push(`Modelo: ${itemEmEdicao.modelo} ➔ ${modelo}`);
    }

    const detalheHistorico = alteracoes.length > 0 ? alteracoes.join(" | ") : "Item atualizado sem alterações de campo";

    fetch(`${SHEETDB_URL}/id/${idExistente}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      sincronizarEstoquePorNome(nome, quantidadeEstoque);
      registrarHistorico("ALTERAÇÃO", nome, detalheHistorico);
    })
    .catch(err => console.error("Erro ao atualizar item:", err));

  } else {
    const novoId = Date.now().toString().slice(-4);
    itemPayload.data.id = novoId;

    fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      sincronizarEstoquePorNome(nome, quantidadeEstoque);
      registrarHistorico("ADICIONOU", nome, `Qtd Inicial: ${quantidade}, Estoque: ${quantidadeEstoque}, Status: ${status}`);
    })
    .catch(err => console.error("Erro ao cadastrar novo item:", err));
  }
}

// Sincronizar Estoque Total por Nome
function sincronizarEstoquePorNome(nomeItem, novoEstoqueTotal) {
  fetch(SHEETDB_URL)
    .then(res => res.json())
    .then(todosItens => {
      const promessas = [];

      if (Array.isArray(todosItens)) {
        todosItens.forEach(item => {
          if ((item.nome || "").trim().toLowerCase() === nomeItem.trim().toLowerCase()) {
            if (item.quantidade_estoque !== novoEstoqueTotal) {
              const promessa = fetch(`${SHEETDB_URL}/id/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  data: { quantidade_estoque: novoEstoqueTotal }
                })
              });
              promessas.push(promessa);
            }
          }
        });
      }

      Promise.all(promessas).then(() => {
        resetarFormulario();
        carregarItens();
      });
    })
    .catch(err => {
      console.error("Erro ao sincronizar estoque total:", err);
      resetarFormulario();
      carregarItens();
    });
}

// Remover Item
function removerItem(id, nomeItem) {
  const senhaConfirmacao = prompt(`Para remover o item "${nomeItem}", insira a palavra-passe de confirmação:`);

  if (senhaConfirmacao === null) {
    return;
  }

  if (senhaConfirmacao.trim() === "@Thales2026!") {
    fetch(`${SHEETDB_URL}/id/${id}`, { method: "DELETE" })
      .then(() => {
        registrarHistorico("REMOVEU", nomeItem, "Item removido do inventário");
        alert(`O item "${nomeItem}" foi removido com sucesso.`);
        carregarItens();
      })
      .catch(err => console.error("Erro ao remover item:", err));
  } else {
    alert("Palavra-passe incorreta! O item não foi removido.");
  }
}

// Filtro Inventário
function filtrarTabela() {
  const input = document.getElementById("search-input");
  if (!input) return;
  const termo = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tbody = document.getElementById("inventory-body");
  const linhas = tbody.getElementsByTagName("tr");

  for (let i = 0; i < linhas.length; i++) {
    const textoLinha = (linhas[i].textContent || linhas[i].innerText).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    linhas[i].style.display = textoLinha.includes(termo) ? "" : "none";
  }
}

// Filtro Histórico
function filtrarHistorico() {
  const input = document.getElementById("search-history-input");
  if (!input) return;
  const termo = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tbody = document.getElementById("history-body");
  const linhas = tbody.getElementsByTagName("tr");

  for (let i = 0; i < linhas.length; i++) {
    const textoLinha = (linhas[i].textContent || linhas[i].innerText).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    linhas[i].style.display = textoLinha.includes(termo) ? "" : "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", filtrarTabela);

  const searchHistoryInput = document.getElementById("search-history-input");
  if (searchHistoryInput) searchHistoryInput.addEventListener("input", filtrarHistorico);
});

// Exportação Excel
function exportarExcel() {
  const visaoInv = document.getElementById("visao-inventario");
  const tabInventarioAtiva = visaoInv.style.display !== "none";

  let dados = [];
  let nomeArquivo = "";

  if (tabInventarioAtiva) {
    const tbody = document.getElementById("inventory-body");
    const linhas = tbody.getElementsByTagName("tr");
    dados = [["Nome", "Marca", "Modelo", "Quantidade", "Estoque Total", "Status", "Responsável", "Data", "Hora"]];

    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].style.display !== "none") {
        const colunas = linhas[i].getElementsByTagName("td");
        let linhaDados = [];
        for (let j = 0; j < colunas.length - 1; j++) {
          linhaDados.push(colunas[j].textContent.trim());
        }
        dados.push(linhaDados);
      }
    }
    nomeArquivo = `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
  } else {
    const tbody = document.getElementById("history-body");
    const linhas = tbody.getElementsByTagName("tr");
    dados = [["Data/Hora", "Utilizador", "Ação", "Item", "Detalhes"]];

    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].style.display !== "none") {
        const colunas = linhas[i].getElementsByTagName("td");
        let linhaDados = [];
        for (let j = 0; j < colunas.length; j++) {
          linhaDados.push(colunas[j].textContent.trim());
        }
        dados.push(linhaDados);
      }
    }
    nomeArquivo = `Historico_${new Date().toISOString().slice(0, 10)}.xlsx`;
  }

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabInventarioAtiva ? "Inventário" : "Histórico");
  XLSX.writeFile(wb, nomeArquivo);
}

// Exportação PDF
function exportarPDF() {
  window.print();
}

// Resetar Formulário
function resetarFormulario() {
  document.getElementById("inventory-form").reset();
  document.getElementById("item-id").value = "";
  itemEmEdicao = null;
  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Adicionar";
  btnSubmit.style.backgroundColor = "#28a745";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
