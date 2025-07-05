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
            alert("Falha no login. Verifique as permissões do Firebase.");
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
        if (confirm('Deseja realmente excluir este registro?')) {
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
    let inicioMinutos = hInicio * 60 + mInicio;
    let fimMinutos = hFim * 60 + mFim;
    if (fimMinutos < inicioMinutos) fimMinutos += 24 * 60;

    let minutosTrabalhados = fimMinutos - inicioMinutos;
    const minutosNoturnos = calcularMinutosNoturnos(inicioMinutos, fimMinutos);
    const minutosAdicional = Math.floor(minutosNoturnos / 60) * 10;
    minutosTrabalhados += minutosAdicional;

    const horas = Math.floor(minutosTrabalhados / 60);
    const minutos = minutosTrabalhados % 60;
    return `${horas}h ${minutos}min`;
}

function calcularMinutosNoturnos(inicioMin, fimMin) {
    let minutosNoturnos = 0;
    const inicioNoite = 0;
    const fimNoite = 6 * 60;
    for (let minuto = inicioMin; minuto < fimMin; minuto++) {
        const minutoDoDia = minuto % (24 * 60);
        if (minutoDoDia >= inicioNoite && minutoDoDia < fimNoite) minutosNoturnos++;
    }
    return minutosNoturnos;
}

function atualizarTotalHoras() {
    const linhas = tabelaHoras.querySelectorAll('tr');
    let totalMinutos = 0;
    linhas.forEach(linha => {
        const textoHoras = linha.children[3].textContent;
        const partes = textoHoras.match(/(\d+)h\s*(\d+)min/);
        if (partes) {
            const horas = parseInt(partes[1]);
            const minutos = parseInt(partes[2]);
            totalMinutos += horas * 60 + minutos;
        }
    });

    const totalHoras = Math.floor(totalMinutos / 60);
    const totalMin = totalMinutos % 60;
    document.getElementById('total-horas').textContent = `${totalHoras}h ${totalMin}min`;

    const metaMinutos = 160 * 60;
    const diferenca = totalMinutos - metaMinutos;
    const campoDiferenca = document.getElementById('horas-faltantes');
    campoDiferenca.className = '';

    if (diferenca === 0) {
        campoDiferenca.textContent = "Meta atingida!";
    } else {
        const difHoras = Math.floor(Math.abs(diferenca) / 60);
        const difMin = Math.abs(diferenca) % 60;
        campoDiferenca.textContent = `${difHoras}h ${difMin}min ${diferenca > 0 ? 'excedentes' : 'faltando'}`;
        campoDiferenca.classList.add(diferenca > 0 ? 'positivo' : 'negativo');
    }
}

function salvarDados() {
    if (!mesSelecionadoAtual || !usuarioAtual) return;

    const linhas = tabelaHoras.querySelectorAll('tr');
    const registros = [];
    linhas.forEach(linha => {
        registros.push({
            dia: linha.children[0].textContent,
            inicio: linha.children[1].textContent,
            fim: linha.children[2].textContent,
        });
    });

    firebase.firestore()
        .collection("usuarios")
        .doc(usuarioAtual.uid)
        .collection("registros")
        .doc(mesSelecionadoAtual)
        .set({ registros })
        .then(() => console.log("Dados salvos no Firestore"))
        .catch(erro => console.error("Erro ao salvar:", erro));
}

function carregarDados() {
    tabelaHoras.innerHTML = '';
    if (!mesSelecionadoAtual || !usuarioAtual) return;

    firebase.firestore()
        .collection("usuarios")
        .doc(usuarioAtual.uid)
        .collection("registros")
        .doc(mesSelecionadoAtual)
        .get()
        .then(doc => {
            if (doc.exists) {
                const registros = doc.data().registros || [];
                registros.forEach(reg => {
                    adicionarLinhaTabela(reg.dia, reg.inicio, reg.fim);
                });
                atualizarTotalHoras();
            }
        })
        .catch(erro => console.error("Erro ao carregar dados:", erro));
}

function nomeMes(numeroMes) {
    const meses = {
        "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
        "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
        "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };
    return meses[numeroMes] || "Mês inválido";
}
