const GAS_URL = "https://script.google.com/macros/s/AKfycbxAvmBtLUPQpeiJepc6xYhB-2vH60TnJUBnmVDtgaQcIBj124BpYSB3sH6bu3zRY6ubjA/exec";

let usuarioAtual = null;
let itemEmEdicao = null;

function formatarDataExibicao(valor) {
  if (!valor) return "";
  let str = String(valor);
  if (str.includes("T")) {
    let partesData = str.split("T")[0].split("-");
    if (partesData.length === 3) {
      return `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
    }
  }
  return str;
}

function formatarHoraExibicao(valor) {
  if (!valor) return "";
  let str = String(valor);
  if (str.includes("T")) {
    let partesHora = str.split("T")[1];
    if (partesHora) {
      return partesHora.substring(0, 5);
    }
  }
  return str;
}

function tentarLoginDireto() {
  const usuarioInput = document.getElementById("usr-field").value.trim();
  const senhaInput = document.getElementById("pwd-field").value.trim();

  if (!usuarioInput || !senhaInput) {
    alert("Por favor, preencha o utilizador e a palavra-passe.");
    return;
  }

  if (usuarioInput === "@Thales" && senhaInput === "@Thales2026!") {
    usuarioAtual = {
      usuario: "@Thales_TEMP",
      isNovoCadastro: true
    };
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("security-code-modal").style.display = "flex";
    return;
  }

  fetch(`${GAS_URL}?sheet=usuarios`)
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

function validarCodigoSeguranca(event) {
  if (event) event.preventDefault();
  const codigoInput = document.getElementById("sec-code-field").value.trim();

  if (!codigoInput) {
    alert("Por favor, insira o código de segurança.");
    return;
  }

  fetch(`${GAS_URL}?action=VALIDAR_CODIGO&codigo=${encodeURIComponent(codigoInput)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ codigo: codigoInput })
  })
  .then(res => res.json())
  .then(resposta => {
    if (resposta.valido === true) {
      document.getElementById("security-code-modal").style.display = "none";
      document.getElementById("first-access-modal").style.display = "flex";
    } else {
      alert("Código de segurança incorreto! Acesso negado.");
      document.getElementById("sec-code-field").value = "";
    }
  })
  .catch(err => {
    console.error("Erro ao validar código:", err);
    alert("Erro de comunicação com o servidor.");
  });
}

function salvarNovaCredencial(event) {
  if (event) event.preventDefault();
  const novoUsuario = document.getElementById("new-usr-field").value.trim();
  const novaSenha = document.getElementById("new-pwd-field").value.trim();

  if (!novoUsuario || !novaSenha) {
    alert("Por favor, preencha o utilizador e a nova palavra-passe.");
    return;
  }

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

    fetch(`${GAS_URL}?sheet=usuarios`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
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
    fetch(`${GAS_URL}?sheet=usuarios&action=UPDATE&usuario=${usuarioAtual.usuario}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
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

function carregarItens() {
  fetch(GAS_URL)
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

          const botaoRemover = `<button class="btn-remover" onclick="removerItem('${item.id}', '${escapeHtml(item.nome)}', '${escapeHtml(item.modelo)}')">Remover</button>`;

          tr.innerHTML = `
            <td>${item.nome || ""} ${ehCritico ? '<span class="badge-critico">Crítico</span>' : ''}</td>
            <td>${item.marca || ""}</td>
            <td>${item.modelo || ""}</td>
            <td>${item.quantidade || "0"}</td>
            <td>${item.quantidade_estoque || "0"}</td>
            <td>${item.status || ""}</td>
            <td>${item.responsavel || ""}</td>
            <td>${formatarDataExibicao(item.data)}</td>
            <td>${formatarHoraExibicao(item.hora)}</td>
            <td class="col-acoes">
              <button class="btn-editar" onclick="prepararEdicao('${item.id}', '${escapeHtml(item.nome)}', '${escapeHtml(item.marca)}', '${escapeHtml(item.modelo)}', '${item.quantidade}', '${item.quantidade_estoque}', '${item.status}', '${escapeHtml(item.responsavel)}')">Editar</button>
              ${botaoRemover}
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      const alertaDiv = document.getElementById("alerta-estoque");
      if (alertaDiv) {
        if (itensCriticos.length > 0) {
          alertaDiv.style.display = "block";
          alertaDiv.innerHTML = `⚠️ <strong>Atenção! Existem produtos com o estoque disponível no limite crítico.</strong>`;
        } else {
          alertaDiv.style.display = "none";
        }
      }

      filtrarTabela();
    })
    .catch(error => console.error("Erro ao carregar inventário:", error));
}

function registrarHistorico(acao, nomeItem, modeloItem, detalhes) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR");
  const horaFormatada = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nomeUsuario = usuarioAtual ? usuarioAtual.nome || usuarioAtual.usuario : "Sistema";

  const historyBody = document.getElementById("history-body");
  if (historyBody) {
    const trHist = document.createElement("tr");
    trHist.innerHTML = `
      <td>${dataFormatada} ${horaFormatada}</td>
      <td><strong>${nomeUsuario}</strong></td>
      <td>${acao}</td>
      <td>${nomeItem}</td>
      <td>${modeloItem || ""}</td>
      <td>${detalhes}</td>
    `;
    historyBody.insertBefore(trHist, historyBody.firstChild);
    filtrarHistorico();
  }

  const registro = {
    data: {
      id: Date.now().toString().slice(-6),
      usuario: nomeUsuario,
      acao: acao,
      item: nomeItem,
      modelo: modeloItem || "",
      detalhes: detalhes,
      data: dataFormatada,
      hora: horaFormatada
    }
  };

  fetch(`${GAS_URL}?sheet=historico`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(registro)
  }).catch(err => console.error("Erro ao gravar histórico:", err));
}

function carregarHistorico() {
  fetch(`${GAS_URL}?sheet=historico`)
    .then(res => res.json())
    .then(dados => {
      const tbody = document.getElementById("history-body");
      tbody.innerHTML = "";

      if (Array.isArray(dados)) {
        dados.reverse().forEach(h => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${formatarDataExibicao(h.data)} ${formatarHoraExibicao(h.hora)}</td>
            <td><strong>${h.usuario || ""}</strong></td>
            <td>${h.acao || ""}</td>
            <td>${h.item || ""}</td>
            <td>${h.modelo || ""}</td>
            <td>${h.detalhes || ""}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      filtrarHistorico();
    })
    .catch(err => console.error("Erro ao carregar histórico:", err));
}

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

  const itemAntigo = itemEmEdicao;

  const agora = new Date();
  const dataAtual = agora.toLocaleDateString('pt-BR');
  const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const tbody = document.getElementById("inventory-body");
  const tempId = idExistente || Date.now().toString().slice(-4);

  // Sincroniza visualmente o estoque total de todas as linhas com o mesmo nome na tabela
  const nomeLower = nome.toLowerCase();
  const linhas = tbody.getElementsByTagName("tr");
  for (let i = 0; i < linhas.length; i++) {
    const colunas = linhas[i].getElementsByTagName("td");
    if (colunas.length < 7) continue;
    const nomeLinha = colunas[0].textContent.replace("Crítico", "").trim().toLowerCase();
    if (nomeLinha === nomeLower) {
      colunas[4].textContent = quantidadeEstoque;
    }
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${nome}</td>
    <td>${marca}</td>
    <td>${modelo}</td>
    <td>${quantidade}</td>
    <td>${quantidadeEstoque}</td>
    <td>${status}</td>
    <td>${responsavel}</td>
    <td>${dataAtual}</td>
    <td>${horaAtual}</td>
    <td class="col-acoes">
      <button class="btn-editar" onclick="prepararEdicao('${tempId}', '${escapeHtml(nome)}', '${escapeHtml(marca)}', '${escapeHtml(modelo)}', '${quantidade}', '${quantidadeEstoque}', '${status}', '${escapeHtml(responsavel)}')">Editar</button>
      <button class="btn-remover" onclick="removerItem('${tempId}', '${escapeHtml(nome)}', '${escapeHtml(modelo)}')">Remover</button>
    </td>
  `;

  if (idExistente) {
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].innerHTML.includes(`prepararEdicao('${idExistente}'`)) {
        linhas[i].remove();
        break;
      }
    }
  }
  tbody.insertBefore(tr, tbody.firstChild);
  resetarFormulario();
  recalcularCriticosLocalmente();

  const itemPayload = {
    data: {
      id: tempId,
      nome, marca, modelo, quantidade,
      quantidade_estoque: quantidadeEstoque,
      status, responsavel,
      data: dataAtual, hora: horaAtual
    }
  };

  if (idExistente) {
    let alteracoes = [];
    if (itemAntigo) {
      if (itemAntigo.nome !== nome) alteracoes.push(`Nome: ${itemAntigo.nome} ➔ ${nome}`);
      if (itemAntigo.marca !== marca) alteracoes.push(`Marca: ${itemAntigo.marca} ➔ ${marca}`);
      if (itemAntigo.modelo !== modelo) alteracoes.push(`Modelo: ${itemAntigo.modelo} ➔ ${modelo}`);
      if (itemAntigo.quantidade !== quantidade) alteracoes.push(`Qtd: ${itemAntigo.quantidade} ➔ ${quantidade}`);
      if (itemAntigo.quantidade_estoque !== quantidadeEstoque) alteracoes.push(`Estoque: ${itemAntigo.quantidade_estoque} ➔ ${quantidadeEstoque}`);
      if (itemAntigo.status !== status) alteracoes.push(`Status: ${itemAntigo.status} ➔ ${status}`);
      if (itemAntigo.responsavel !== responsavel) alteracoes.push(`Resp: ${itemAntigo.responsavel} ➔ ${responsavel}`);
    }
    const detalheHistorico = alteracoes.length > 0 ? alteracoes.join(" | ") : "Item atualizado";

    fetch(`${GAS_URL}?action=UPDATE&id=${idExistente}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      registrarHistorico("ALTERAÇÃO", nome, modelo, detalheHistorico);
    })
    .catch(err => console.error("Erro ao atualizar item:", err));

  } else {
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(itemPayload)
    })
    .then(() => {
      registrarHistorico("ADICIONOU", nome, modelo, `Qtd Inicial: ${quantidade}, Estoque: ${quantidadeEstoque}, Status: ${status}`);
    })
    .catch(err => console.error("Erro ao cadastrar novo item:", err));
  }
}

function removerItem(id, nomeItem, modeloItem) {
  const senhaConfirmacao = prompt(`Para remover o item "${nomeItem}", insira a palavra-passe de confirmação:`);

  if (senhaConfirmacao === null) return;

  if (senhaConfirmacao.trim() === "@Thales2026!") {
    const tbody = document.getElementById("inventory-body");
    const linhas = tbody.getElementsByTagName("tr");
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].innerHTML.includes(`removerItem('${id}'`)) {
        linhas[i].remove();
        break;
      }
    }
    recalcularCriticosLocalmente();

    fetch(`${GAS_URL}?action=DELETE&id=${id}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ id: id })
    })
    .then(() => {
      registrarHistorico("REMOVEU", nomeItem, modeloItem, "Item removido do inventário");
      alert(`O item "${nomeItem}" foi removido com sucesso.`);
    })
    .catch(err => console.error("Erro ao remover item:", err));
  } else {
    alert("Palavra-passe incorreta! O item não foi removido.");
  }
}

function recalcularCriticosLocalmente() {
  const tbody = document.getElementById("inventory-body");
  const linhas = tbody.getElementsByTagName("tr");
  let totais = {};

  for (let i = 0; i < linhas.length; i++) {
    const colunas = linhas[i].getElementsByTagName("td");
    if (colunas.length < 7) continue;
    
    const nomeOriginal = colunas[0].textContent.replace("Crítico", "").trim();
    const nomeChave = nomeOriginal.toLowerCase();
    const qtd = parseInt(colunas[3].textContent) || 0;
    const estoqueTotal = parseInt(colunas[4].textContent) || 0;
    const status = colunas[5].textContent.trim().toLowerCase();

    if (!totais[nomeChave]) {
      totais[nomeChave] = { nomeOriginal: nomeOriginal, somaOcupada: 0, estoqueTotal: estoqueTotal };
    }

    if (!status.includes("disponivel")) {
      totais[nomeChave].somaOcupada += qtd;
    }
    if (estoqueTotal > 0) {
      totais[nomeChave].estoqueTotal = estoqueTotal;
    }
  }

  let temCriticoGeral = false;
  for (let i = 0; i < linhas.length; i++) {
    const colunas = linhas[i].getElementsByTagName("td");
    if (colunas.length < 7) continue;

    const nomeOriginal = colunas[0].textContent.replace("Crítico", "").trim();
    const nomeChave = nomeOriginal.toLowerCase();
    const info = totais[nomeChave];
    
    if (info) {
      const disponivelReal = info.estoqueTotal - info.somaOcupada;
      if (disponivelReal <= 5) {
        temCriticoGeral = true;
        linhas[i].classList.add("linha-critica");
        if (!colunas[0].innerHTML.includes("badge-critico")) {
          colunas[0].innerHTML = `${info.nomeOriginal} <span class="badge-critico">Crítico</span>`;
        }
      } else {
        linhas[i].classList.remove("linha-critica");
        colunas[0].innerHTML = info.nomeOriginal;
      }
    }
  }

  const alertaDiv = document.getElementById("alerta-estoque");
  if (alertaDiv) {
    if (temCriticoGeral) {
      alertaDiv.style.display = "block";
      alertaDiv.innerHTML = `⚠️ <strong>Atenção! Existem produtos com o estoque disponível no limite crítico.</strong>`;
    } else {
      alertaDiv.style.display = "none";
    }
  }
}

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
          linhaDados.push(colunas[j].textContent.replace("Crítico", "").trim());
        }
        dados.push(linhaDados);
      }
    }
    nomeArquivo = `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
  } else {
    const tbody = document.getElementById("history-body");
    const linhas = tbody.getElementsByTagName("tr");
    dados = [["Data/Hora", "Utilizador", "Ação", "Item", "Modelo", "Detalhes"]];

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

function exportarPDF() {
  window.print();
}

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