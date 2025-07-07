// script.js atualizado
const btnGoogle = document.getElementById('btn-google');
const telaLogin = document.getElementById('tela-login');
const telaSelecaoMes = document.getElementById('tela-selecao-mes');
const telaRegistroHoras = document.getElementById('tela-registro-horas');
const btnConfirmarMes = document.getElementById('btn-confirmar-mes');
const mesAtualSpan = document.getElementById('mes-atual');
const selecaoMes = document.getElementById('selecao-mes');
const btnVoltar = document.getElementById('btn-voltar');
const btnAdicionarDia = document.getElementById('btn-adicionar-dia');
const formAdicionar = document.getElementById('form-adicionar');
const btnSalvarRegistro = document.getElementById('btn-salvar-registro');
const tabelaHoras = document.getElementById('tabela-horas');
const btnSair = document.getElementById('btn-sair');
const saldoAnteriorInput = document.getElementById('saldo-anterior');

let usuarioAtual = null;
let mesSelecionadoAtual = null;

btnGoogle.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then(result => {
            usuarioAtual = result.user;
            telaLogin.style.display = 'none';
            telaSelecaoMes.style.display = 'block';
        })
        .catch(error => {
            console.error("Erro no login:", error);
            alert("Falha no login.");
        });
});

btnConfirmarMes.addEventListener('click', () => {
    mesSelecionadoAtual = selecaoMes.value;
    telaSelecaoMes.style.display = 'none';
    telaRegistroHoras.style.display = 'block';
    mesAtualSpan.textContent = nomeMes(mesSelecionadoAtual);
    carregarDados();
});

btnVoltar.addEventListener('click', () => {
    telaRegistroHoras.style.display = 'none';
    telaSelecaoMes.style.display = 'block';
    tabelaHoras.innerHTML = '';
    formAdicionar.style.display = 'none';
});

btnAdicionarDia.addEventListener('click', () => {
    formAdicionar.style.display = 'block';
});

btnSalvarRegistro.addEventListener('click', () => {
    const dia = document.getElementById('dia').value;
    const horaInicio = document.getElementById('hora-inicio').value;
    const horaFim = document.getElementById('hora-fim').value;

    if (dia === '' || horaInicio === '' || horaFim === '') {
        alert('Preencha todos os campos!');
        return;
    }

    adicionarLinhaTabela(dia, horaInicio, horaFim);
    document.getElementById('dia').value = '';
    document.getElementById('hora-inicio').value = '';
    document.getElementById('hora-fim').value = '';
    formAdicionar.style.display = 'none';
    atualizarTotalHoras();
    salvarDados();
});

btnSair.addEventListener('click', () => {
    firebase.auth().signOut().then(() => location.reload());
});

saldoAnteriorInput.addEventListener('change', () => {
    atualizarTotalHoras();
    salvarDados();
});

function adicionarLinhaTabela(dia, horaInicio, horaFim) {
    const horasTrabalhadas = calcularHoras(horaInicio, horaFim);
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
        <td>${dia}</td>
        <td>${horaInicio}</td>
        <td>${horaFim}</td>
        <td>${horasTrabalhadas}</td>
        <td>
            <button class="btn-editar">Editar</button>
            <button class="btn-excluir">Excluir</button>
        </td>
    `;
    tabelaHoras.appendChild(novaLinha);

    novaLinha.querySelector('.btn-excluir').addEventListener('click', () => {
        if (confirm('Deseja excluir?')) {
            novaLinha.remove();
            atualizarTotalHoras();
            salvarDados();
        }
    });

    novaLinha.querySelector('.btn-editar').addEventListener('click', () => {
        document.getElementById('dia').value = dia;
        document.getElementById('hora-inicio').value = horaInicio;
        document.getElementById('hora-fim').value = horaFim;
        formAdicionar.style.display = 'block';
        novaLinha.remove();
        atualizarTotalHoras();
        salvarDados();
    });
}

function calcularHoras(inicio, fim) {
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    let inicioMin = hInicio * 60 + mInicio;
    let fimMin = hFim * 60 + mFim;
    if (fimMin < inicioMin) fimMin += 24 * 60;

    let minutos = fimMin - inicioMin;
    minutos += Math.floor(calcularMinutosNoturnos(inicioMin, fimMin) / 60) * 10;

    return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
}

function calcularMinutosNoturnos(inicio, fim) {
    let total = 0;
    for (let m = inicio; m < fim; m++) {
        const minDia = m % (24 * 60);
        if (minDia >= 1380 || minDia < 300) total++;
    }
    return total;
}

function atualizarTotalHoras() {
    const linhas = tabelaHoras.querySelectorAll('tr');
    let totalMin = parseInt(saldoAnteriorInput.value) || 0;

    linhas.forEach(linha => {
        const match = linha.children[3].textContent.match(/(\d+)h\s*(\d+)min/);
        if (match) totalMin += parseInt(match[1]) * 60 + parseInt(match[2]);
    });

    const horas = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    document.getElementById('total-horas').textContent = `${horas}h ${min}min`;

    const diff = totalMin - 160 * 60;
    const campo = document.getElementById('horas-faltantes');
    campo.className = '';

    if (diff === 0) campo.textContent = 'Meta atingida!';
    else {
        const h = Math.floor(Math.abs(diff) / 60);
        const m = Math.abs(diff) % 60;
        campo.textContent = `${h}h ${m}min ${diff > 0 ? 'excedentes' : 'faltando'}`;
        campo.classList.add(diff > 0 ? 'positivo' : 'negativo');
    }
}

function salvarDados() {
    if (!mesSelecionadoAtual || !usuarioAtual) return;

    const registros = [];
    tabelaHoras.querySelectorAll('tr').forEach(linha => {
        registros.push({
            dia: linha.children[0].textContent,
            inicio: linha.children[1].textContent,
            fim: linha.children[2].textContent,
        });
    });

    firebase.firestore().collection('usuarios').doc(usuarioAtual.uid)
        .collection('registros').doc(mesSelecionadoAtual)
        .set({ registros, saldo: parseInt(saldoAnteriorInput.value) || 0 });
}

function carregarDados() {
    tabelaHoras.innerHTML = '';
    saldoAnteriorInput.value = '';

    firebase.firestore().collection('usuarios').doc(usuarioAtual.uid)
        .collection('registros').doc(mesSelecionadoAtual)
        .get()
        .then(doc => {
            if (doc.exists) {
                const dados = doc.data();
                (dados.registros || []).forEach(reg => adicionarLinhaTabela(reg.dia, reg.inicio, reg.fim));
                saldoAnteriorInput.value = dados.saldo || 0;
            }
            atualizarTotalHoras();
        });
}

function nomeMes(m) {
    return {
        "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
        "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
        "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    }[m] || 'Mês inválido';
}

