// Configuração da API SheetDB
const SHEETDB_URL = "https://sheetdb.io/api/v1/in9wws1z72a7q";

// Estado da Sessão Atual
let usuarioAtual = null;

// Tentar realizar o Login
function tentarLogin(event) {
  event.preventDefault();
  
  const usuarioInput = document.getElementById("usr-field").value.trim();
  const senhaInput = document.getElementById("pwd-field").value.trim();

  // Buscar utilizadores no SheetDB (Aba usuarios)
  fetch(`${SHEETDB_URL}?sheet=usuarios`)
    .then(res => res.json())
    .then(usuarios => {
      const encontrou = usuarios.find(u => u.usuario === usuarioInput && u.senha === senhaInput);

      if (encontrou) {
        usuarioAtual = encontrou;

        // Se for Primeiro Acesso, força a troca de dados
        if (encontrou.primeiro_acesso === "true" || encontrou.primeiro_acesso === "TRUE") {
          document.getElementById("login-modal").style.display = "none";
          document.getElementById("first-access-modal").style.display = "flex";
        } else {
          iniciarSessao();
        }
      } else {
        alert("Utilizador ou palavra-passe incorretos. Tente novamente.");
      }
    })
    .catch(err => {
      console.error("Erro ao autenticar:", err);
      alert("Erro de comunicação com o servidor ou credenciais inválidas.");
    });
}

// Salvar novos dados no Primeiro Acesso
function salvarNovaCredencial(event) {
  event.preventDefault();
  const novoUsuario = document.getElementById("new-usr-field").value.trim();
  const novaSenha = document.getElementById("new-pwd-field").value.trim();

  if (!novoUsuario || !novaSenha) {
    alert("Por favor, preencha o utilizador e a nova palavra-passe.");
    return;
  }

  // Atualizar utilizador no SheetDB
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

// Iniciar Aplicação após Autenticação
function iniciarSessao() {
  document.getElementById("login-modal").style.display = "none";
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
}

// Alternar entre Abas (Inventário vs Histórico)
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

// Carregar Itens da Tabela Principal
function carregarItens() {
  fetch(SHEETDB_URL)
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById("inventory-body");
      tbody.innerHTML = "";
      let temCritico = false;

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const qtdEstoque = parseInt(item.quantidade_estoque || 0);
          const ehCritico = qtdEstoque <= 5;
          if (ehCritico) temCritico = true;

          const tr = document.createElement("tr");
          if (ehCritico) tr.classList.add("linha-critica");

          const botaoRemover = `<button class="btn-remover" onclick="removerItem('${item.id}', '${escapeHtml(item.nome)}')">Remover</button>`;

          tr.innerHTML = `
            <td>${item.nome || ""} ${ehCritico ? '<span class="badge-critico">Mínimo</span>' : ''}</td>
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

      document.getElementById("alerta-estoque").style.display = temCritico ? "block" : "none";
      filtrarTabela();
    })
    .catch(error => console.error("Erro ao carregar inventário:", error));
}

// Registar Movimentação na Aba `historico`
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

// Carregar Lista de Histórico
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

// Salvar / Editar Item
function salvarItem(event) {
  event.preventDefault();

  const idExistente = document.getElementById("item-id").value;
  const nome = document.getElementById("nome").value;
  const marca = document.getElementById("marca").value;
  const modelo = document.getElementById("modelo").value;
  const quantidade = document.getElementById("quantidade").value;
  const quantidadeEstoque = document.getElementById("quantidade_estoque").value;
  const status = document.getElementById("status").value;
  const responsavel = document.getElementById("responsavel").value;

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
    fetch(`${SHEETDB_URL}/id/${idExistente}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      registrarHistorico("ALTERAÇÃO", nome, `Qtd: ${quantidade}, Estoque: ${quantidadeEstoque}, Status: ${status}`);
      resetarFormulario();
      carregarItens();
    });
  } else {
    const novoId = Date.now().toString().slice(-4);
    itemPayload.data.id = novoId;

    fetch(SHEETDB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      registrarHistorico("ADICIONOU", nome, `Qtd Inicial: ${quantidade}, Estoque: ${quantidadeEstoque}`);
      resetarFormulario();
      carregarItens();
    });
  }
}

// Remover Item
function removerItem(id, nomeItem) {
  if (confirm(`Tem certeza que deseja remover o item "${nomeItem}"?`)) {
    fetch(`${SHEETDB_URL}/id/${id}`, { method: "DELETE" })
      .then(() => {
        registrarHistorico("REMOVEU", nomeItem, "Item removido do inventário");
        carregarItens();
      });
  }
}

// Filtro da Tabela de Inventário
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

// Filtro da Tabela de Histórico
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

// Exportação Excel (Dinâmica: Inventário ou Histórico)
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

function prepararEdicao(id, nome, marca, modelo, quantidade, quantidadeEstoque, status, responsavel) {
  document.getElementById("item-id").value = id;
  document.getElementById("nome").value = nome;
  document.getElementById("marca").value = marca !== 'undefined' ? marca : '';
  document.getElementById("modelo").value = modelo !== 'undefined' ? modelo : '';
  document.getElementById("quantidade").value = quantidade;
  document.getElementById("quantidade_estoque").value = quantidadeEstoque !== 'undefined' ? quantidadeEstoque : '0';
  document.getElementById("status").value = status;
  document.getElementById("responsavel").value = responsavel;

  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Atualizar";
  btnSubmit.style.backgroundColor = "#ffc107";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetarFormulario() {
  document.getElementById("inventory-form").reset();
  document.getElementById("item-id").value = "";
  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Adicionar";
  btnSubmit.style.backgroundColor = "#28a745";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}