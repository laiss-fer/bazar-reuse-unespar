
// Formatação dos valores monetários
function formatarReais(valor) {
    return (valor / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Converte reais para centavos
function paraCentavos(valor) {
    return Math.round(Number(valor) * 100);
}

// Retorna a data local de hoje
function obterDataHoje() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(
        hoje.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        hoje.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// Consulta todas as linhas, em lotes
async function consultarRegistros(
    tabela,
    colunas,
    campoData,
    inicioISO,
    fimISO,
    campoOrdem
) {
    const registros = [];
    const tamanhoLote = 1000;

    for (let inicio = 0; ; inicio += tamanhoLote) {
        const { data, error } = await supabaseClient
            .from(tabela)
            .select(colunas)
            .gte(campoData, inicioISO)
            .lt(campoData, fimISO)
            .order(campoOrdem, { ascending: true })
            .range(inicio, inicio + tamanhoLote - 1);

        if (error) throw error;

        registros.push(...data);

        if (data.length < tamanhoLote) {
            break;
        }
    }

    return registros;
}

// Carrega o resumo da data selecionada
async function carregarResumo() {
    const mensagem =
        document.getElementById("mensagemResumo");

    const dataSelecionada =
        document.getElementById("dataResumo").value;

    if (!dataSelecionada) {
        mensagem.textContent = "Selecione uma data.";
        return;
    }

    const inicio = new Date(
        dataSelecionada + "T00:00:00"
    );

    if (Number.isNaN(inicio.getTime())) {
        mensagem.textContent = "Data inválida.";
        return;
    }

    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);

    const inicioISO = inicio.toISOString();
    const fimISO = fim.toISOString();

    mensagem.textContent = "Consultando informações...";

    try {
        // Vendas do dia
        const vendas = await consultarRegistros(
            "reuse_vendas",
            "id_venda,quantidade5,quantidade10," +
            "vouchers_utilizados,valor_recebido," +
            "forma_pagamento",
            "data_venda",
            inicioISO,
            fimISO,
            "id_venda"
        );

        // Movimentações do caixa do dia
        const movimentacoes = await consultarRegistros(
            "reuse_movimentacoes_caixa",
            "id_movimentacao,tipo,valor",
            "data_movimentacao",
            inicioISO,
            fimISO,
            "id_movimentacao"
        );

        // Estoque atual
        const { data: estoque, error: erroEstoque } =
            await supabaseClient
                .from("reuse_estoque")
                .select("preco, quantidade");

        if (erroEstoque) throw erroEstoque;

        let pix = 0;
        let dinheiro = 0;

        let pecasVendidas = 0;
        let pecasVoucher = 0;
        let pecasRetiradas = 0;

        for (const venda of vendas) {
            const valor = paraCentavos(
                venda.valor_recebido
            );

            const qtd5 = Number(venda.quantidade5);
            const qtd10 = Number(venda.quantidade10);
            const vouchers = Number(
                venda.vouchers_utilizados
            );

            if (venda.forma_pagamento === "Pix") {
                pix += valor;
            }

            if (venda.forma_pagamento === "Dinheiro") {
                dinheiro += valor;
            }

            const totalPecas = qtd5 + qtd10;

            pecasRetiradas += totalPecas;
            pecasVoucher += vouchers;

            pecasVendidas += totalPecas - vouchers;
        }

        const arrecadacao = pix + dinheiro;

        // Soma as movimentações do caixa
        let saldoInicial = 0;
        let despesas = 0;
        let retiradas = 0;
        let quantidadeSaldosIniciais = 0;

        for (const movimento of movimentacoes) {
            const valor = paraCentavos(movimento.valor);

            if (movimento.tipo === "Saldo inicial") {
                saldoInicial += valor;
                quantidadeSaldosIniciais++;
            }

            if (movimento.tipo === "Despesa") {
                despesas += valor;
            }

            if (movimento.tipo === "Retirada") {
                retiradas += valor;
            }
        }

        // Saldo esperado em dinheiro
        const saldoFinal =
            saldoInicial +
            dinheiro -
            despesas -
            retiradas;
			const totalFinanceiro = saldoFinal + pix;

        // Quantidade total disponível agora
        let pecasEstoque = 0;

        for (const item of estoque) {
            pecasEstoque += Number(item.quantidade);
        }

        // Atualiza os recebimentos
        document.getElementById("arrecadacao")
            .textContent = formatarReais(arrecadacao);

        document.getElementById("totalPix")
            .textContent = formatarReais(pix);

        document.getElementById("totalDinheiro")
            .textContent = formatarReais(dinheiro);

        // Atualiza o fechamento do caixa
        document.getElementById("saldoInicial")
            .textContent = formatarReais(saldoInicial);

        document.getElementById("dinheiroCaixa")
            .textContent = formatarReais(dinheiro);

        document.getElementById("despesas")
            .textContent = formatarReais(despesas);

        document.getElementById("retiradas")
            .textContent = formatarReais(retiradas);

        document.getElementById("saldoFinal")
            .textContent = formatarReais(saldoFinal);
			

			document.getElementById("pixFechamento")
			    .textContent = formatarReais(pix);

			document.getElementById("totalFinanceiro")
			    .textContent = formatarReais(totalFinanceiro);


        // Atualiza as quantidades
        document.getElementById("pecasVendidas")
            .textContent = pecasVendidas;

        document.getElementById("pecasVoucher")
            .textContent = pecasVoucher;

        document.getElementById("pecasRetiradas")
            .textContent = pecasRetiradas;

        document.getElementById("quantidadeVendas")
            .textContent = vendas.length;

        document.getElementById("pecasEstoque")
            .textContent = pecasEstoque;

        if (quantidadeSaldosIniciais > 1) {
            mensagem.textContent =
                "Atenção: existe mais de um lançamento " +
                "de saldo inicial nesta data. " +
                "Confira as movimentações.";
        } else {
            mensagem.textContent =
                "Resumo atualizado com sucesso!";
        }

    } catch (erro) {
        console.error(erro);

        mensagem.textContent =
            "Erro ao consultar o resumo: " +
            erro.message;
    }
}

// Verifica o login e inicia a página
async function iniciarResumo() {
    try {
        const { data, error } =
            await supabaseClient.auth.getUser();

        if (error || !data.user) {
            window.location.href = "index.html";
            return;
        }

        document.getElementById("paginaResumo")
            .style.display = "block";

        document.getElementById("dataResumo")
            .value = obterDataHoje();

        await carregarResumo();

    } catch (erro) {
        console.error(erro);
        window.location.href = "index.html";
    }
}

iniciarResumo();
