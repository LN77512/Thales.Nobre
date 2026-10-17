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
              <button class="btn-remover" onclick="removerItem('${item.id}')">Remover</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
      
      // Reaplica o filtro caso haja texto digitado na pesquisa
      filtrarTabela();
    })
    .catch(error => console.error("Erro ao carregar itens do SheetDB:", error));
}

// Função para filtrar a tabela em tempo real ignorando acentos e maiúsculas
function filtrarTabela() {
  const input = document.getElementById("search-input");
  if (!input) return;

  const termo = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tbody = document.getElementById("inventory-body");
  const linhas = tbody.getElementsByTagName("tr");

  for (let i = 0; i < linhas.length; i++) {
    const textoLinha = (linhas[i].textContent || linhas[i].innerText)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (textoLinha.includes(termo)) {
      linhas[i].style.display = "";
    } else {
      linhas[i].style.display = "none";
    }
  }
}

// Ativa a pesquisa em tempo real assim que o utilizador digita
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", filtrarTabela);
    searchInput.addEventListener("keyup", filtrarTabela);
  }
});

// Exporta os itens visíveis para ficheiro de Excel (.csv formatado para Excel)
function exportarExcel() {
  const tbody = document.getElementById("inventory-body");
  const linhas = tbody.getElementsByTagName("tr");
  
  if (linhas.length === 0) {
    alert("Não existem dados para exportar.");
    return;
  }

  let conteudoCSV = [];
  const cabecalhos = ["Nome", "Marca", "Modelo", "Quantidade", "Estoque Total", "Status", "Responsável", "Data", "Hora"];
  conteudoCSV.push(cabecalhos.map(h => `"${h}"`).join(";"));

  let temDadosVisiveis = false;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].style.display !== "none") {
      temDadosVisiveis = true;
      const colunas = linhas[i].getElementsByTagName("td");
      let linhaDados = [];
      
      for (let j = 0; j < colunas.length - 1; j++) {
        let texto = colunas[j].textContent.trim().replace(/"/g, '""');
        linhaDados.push(`"${texto}"`);
      }
      conteudoCSV.push(linhaDados.join(";"));
    }
  }

  if (!temDadosVisiveis) {
    alert("Nenhum item visível com o filtro atual para exportar.");
    return;
  }

  const csvBlob = new Blob(["\uFEFF" + conteudoCSV.join("\n")], { type: "text/csv;charset=utf-8;" });
  const dataFormatada = new Date().toISOString().slice(0, 10);
  const linkDownload = document.createElement("a");
  
  linkDownload.href = URL.createObjectURL(csvBlob);
  linkDownload.setAttribute("download", `Inventario_${dataFormatada}.csv`);
  document.body.appendChild(linkDownload);
  linkDownload.click();
  document.body.removeChild(linkDownload);
}

// Gera relatório em PDF limpo e ajustado em orientação Paisagem
function exportarPDF() {
  const tbody = document.getElementById("inventory-body");
  const linhas = tbody.getElementsByTagName("tr");
  let linhasHTML = "";

  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].style.display !== "none") {
      const tds = linhas[i].getElementsByTagName("td");
      linhasHTML += "<tr>";
      for (let j = 0; j < tds.length - 1; j++) {
        linhasHTML += `<td>${tds[j].textContent.trim()}</td>`;
      }
      linhasHTML += "</tr>";
    }
  }

  if (!linhasHTML) {
    alert("Nenhum item visível para gerar o PDF.");
    return;
  }

  const janelaPDF = window.open("", "_blank");
  const dataAtual = new Date().toLocaleDateString("pt-BR");

  janelaPDF.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Inventário - THALES</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 15px; color: #333; }
        h1 { color: #002b5c; font-size: 1.5em; margin-bottom: 5px; }
        p { font-size: 0.85em; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; word-wrap: break-word; }
        th { background-color: #002b5c; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>THALES Information Systems - Relatório de Inventário</h1>
      <p>Gerado em: ${dataAtual}</p>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Qtd</th>
            <th>Estoque</th>
            <th>Status</th>
            <th>Responsável</th>
            <th>Data</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          ${linhasHTML}
        </tbody>
      </table>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  janelaPDF.document.close();
}

// Auxiliar para evitar problemas de aspas na função de edição
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// Adicionar ou Atualizar item (POST / PUT)
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
          marca: marca,
          modelo: modelo,
          quantidade: quantidade,
          quantidade_estoque: quantidadeEstoque,
          status: status,
          responsavel: responsavel,
          data: dataAtual,
          hora: horaAtual
        }
      })
    })
    .then(response => response.json())
    .then(() => {
      resetarFormulario();
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
        marca: marca,
        modelo: modelo,
        quantidade: quantidade,
        quantidade_estoque: quantidadeEstoque,
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
      resetarFormulario();
      carregarItens();
    })
    .catch(error => console.error("Erro ao salvar item:", error));
  }
}

// Preencher o formulário com os dados para edição
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

// Limpar formulário e restaurar botão
function resetarFormulario() {
  document.getElementById("inventory-form").reset();
  document.getElementById("item-id").value = "";
  const btnSubmit = document.getElementById("btn-submit");
  btnSubmit.textContent = "Adicionar";
  btnSubmit.style.backgroundColor = "#28a745";
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