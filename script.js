// URL da API do SheetDB
const SHEETDB_URL = "https://sheetdb.io/api/v1/in9wws1z72a7q";

function tentarLogin(event) {
  event.preventDefault();
  
  const usuario = document.getElementById("usr-field").value.trim();
  const palavraPasse = document.getElementById("pwd-field").value.trim();

  if (usuario === "@Thales" && palavraPasse === "@Thales2026!") {
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    carregarItens();
  } else {
    alert("Utilizador ou palavra-passe incorretos. Tente novamente.");
  }
}

// Ler os itens da base de dados SheetDB (GET)
function carregarItens() {
  fetch(SHEETDB_URL)
    .then(response => response.json())
    .then(data => {
      const tbody = document.getElementById("inventory-body");
      tbody.innerHTML = "";
      
      if (Array.isArray(data)) {
        data.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${item.nome || ""}</td>
            <td>${item.quantidade || ""}</td>
            <td>${item.status || ""}</td>
            <td>${item.responsavel || ""}</td>
            <td>${item.data || ""}</td>
            <td>${item.hora || ""}</td>
            <td>
              <button class="btn-editar" onclick="prepararEdicao('${item.id}', '${item.nome}', '${item.quantidade}', '${item.status}', '${item.responsavel}')">Editar</button>
              <button class="btn-remover" onclick="removerItem('${item.id}')">Remover</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    })
    .catch(error => console.error("Erro ao carregar itens do SheetDB:", error));
}

// Adicionar ou Atualizar item com Data e Hora em colunas separadas (POST / PUT)
function salvarItem(event) {
  event.preventDefault();

  const idExistente = document.getElementById("item-id").value;
  const nome = document.getElementById("nome").value;
  const quantidade = document.getElementById("quantidade").value;
  const status = document.getElementById("status").value;
  const responsavel = document.getElementById("responsavel").value;
  
  const agora = new Date();
  const dataAtual = agora.toLocaleDateString('pt-BR');
  const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (idExistente) {
    // EDITAR ITEM EXISTENTE (PUT)
    fetch(`${SHEETDB_URL}/id/${idExistente}`, {
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          nome: nome,
          quantidade: quantidade,
          status: status,
          responsavel: responsavel,
          data: dataAtual,
          hora: horaAtual
        }
      })
    })
    .then(response => response.json())
    .then(() => {
      document.getElementById("inventory-form").reset();
      document.getElementById("item-id").value = "";
      document.getElementById("btn-submit").textContent = "Adicionar";
      document.getElementById("btn-submit").style.backgroundColor = "#28a745";
      carregarItens();
    })
    .catch(error => console.error("Erro ao atualizar item:", error));

  } else {
    // ADICIONAR NOVO ITEM (POST)
    const novoId = Date.now().toString().slice(-4);

    const dadosItem = {
      data: {
        id: novoId,
        nome: nome,
        quantidade: quantidade,
        status: status,
        responsavel: responsavel,
        data: dataAtual,
        hora: horaAtual
      }
    };

    fetch(SHEETDB_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dadosItem)
    })
    .then(response => response.json())
    .then(() => {
      document.getElementById("inventory-form").reset();
      carregarItens();
    })
    .catch(error => console.error("Erro ao salvar item:", error));
  }
}

// Preencher o formulário com os dados para edição
function prepararEdicao(id, nome, quantidade, status, responsavel) {
  document.getElementById("item-id").value = id;
  document.getElementById("nome").value = nome;
  document.getElementById("quantidade").value = quantidade;
  document.getElementById("status").value = status;
  document.getElementById("responsavel").value = responsavel;

  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Atualizar";
  btnSubmit.style.backgroundColor = "#ffc107";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remover um item pelo ID (DELETE)
function removerItem(id) {
  if (confirm("Tem certeza que deseja remover este item?")) {
    fetch(`${SHEETDB_URL}/id/${id}`, {
      method: "DELETE",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(() => {
      carregarItens();
    })
    .catch(error => console.error("Erro ao remover item:", error));
  }
}