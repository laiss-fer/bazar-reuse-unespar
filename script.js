
let quantidade5 = 0;
let quantidade10 = 0;
let vendaEmAndamento = false;

// Formata valores em reais
function formatarMoeda(valor) {
    return Number(valor).toFixed(2).replace(".", ",");
}

// Adiciona uma peça ao carrinho
function adicionarPeca(preco) {
    if (vendaEmAndamento) return;

    if (preco === 5) {
        quantidade5++;
    } else if (preco === 10) {
        quantidade10++;
    }

    atualizarCarrinho();
}

// Remove uma peça do carrinho
function removerPeca(preco) {
    if (vendaEmAndamento) return;

    if (preco === 5 && quantidade5 > 0) {
        quantidade5--;
    } else if (preco === 10 && quantidade10 > 0) {
        quantidade10--;
    }

    atualizarCarrinho();
}

// Calcula os valores da venda
function calcularVenda() {
    const campo = document.getElementById("quantidadeVouchers");
    const texto = campo.value.trim();
    const vouchers = Number(texto);

    const totalPecas = quantidade5 + quantidade10;
    const subtotal = quantidade5 * 5 + quantidade10 * 10;

    if (
        texto === "" ||
        !Number.isSafeInteger(vouchers) ||
        vouchers < 0 ||
        vouchers > totalPecas
    ) {
        return null;
    }

    // Vouchers cobrem primeiro as peças de R$ 10
    const vouchers10 = Math.min(vouchers, quantidade10);
    const vouchers5 = vouchers - vouchers10;

    const desconto = vouchers10 * 10 + vouchers5 * 5;
    const totalPagar = subtotal - desconto;

    return {
        totalPecas: totalPecas,
        subtotal: subtotal,
        vouchers: vouchers,
        desconto: desconto,
        totalPagar: totalPagar
    };
}

// Atualiza os valores exibidos na tela
function atualizarCarrinho() {
    const totalPecas = quantidade5 + quantidade10;
    const subtotal = quantidade5 * 5 + quantidade10 * 10;

    document.getElementById("qtd5").textContent = quantidade5;
    document.getElementById("qtd10").textContent = quantidade10;

    document.getElementById("totalPecas").textContent =
        totalPecas;

    document.getElementById("subtotal").textContent =
        formatarMoeda(subtotal);

    document.getElementById("total").textContent =
        formatarMoeda(subtotal);

    const venda = calcularVenda();

    const areaPagamento =
        document.getElementById("areaPagamento");

    const mensagemVoucher =
        document.getElementById("mensagemVoucher");

    if (!venda) {
        document.getElementById("desconto").textContent =
            "Inválido";

        document.getElementById("totalPagar").textContent =
            "Inválido";

        areaPagamento.style.display = "none";
        mensagemVoucher.style.display = "none";
        return;
    }

    document.getElementById("desconto").textContent =
        formatarMoeda(venda.desconto);

    document.getElementById("totalPagar").textContent =
        formatarMoeda(venda.totalPagar);

    if (totalPecas > 0 && venda.totalPagar === 0) {
        areaPagamento.style.display = "none";
        mensagemVoucher.style.display = "block";
    } else {
        areaPagamento.style.display = "block";
        mensagemVoucher.style.display = "none";
    }
}

// Limpa o carrinho
function limparCarrinho() {
    if (vendaEmAndamento) return;

    quantidade5 = 0;
    quantidade10 = 0;

    document.getElementById("quantidadeVouchers").value = 0;
    document.getElementById("pagamento").value = "Pix";

    document.getElementById("mensagem").textContent = "";

    atualizarCarrinho();
}

// Registra a venda no PostgreSQL
async function finalizarVenda() {
    if (vendaEmAndamento) return;

    const mensagem = document.getElementById("mensagem");
    const venda = calcularVenda();

    mensagem.textContent = "";

    if (!venda) {
        mensagem.textContent =
            "Quantidade de vouchers inválida.";
        return;
    }

    if (venda.totalPecas === 0) {
        mensagem.textContent =
            "Adicione pelo menos uma peça ao carrinho.";
        return;
    }

    let pagamento =
        document.getElementById("pagamento").value;

    if (venda.totalPagar === 0) {
        pagamento = "Somente vouchers";
    }

    const confirmar = window.confirm(
        "Confirmar esta venda?\n\n" +
        "Peças de R$ 5: " + quantidade5 + "\n" +
        "Peças de R$ 10: " + quantidade10 + "\n" +
        "Vouchers: " + venda.vouchers + "\n" +
        "Valor recebido: R$ " +
        formatarMoeda(venda.totalPagar) + "\n" +
        "Pagamento: " + pagamento
    );

    if (!confirmar) return;

    vendaEmAndamento = true;

    const botaoFinalizar =
        document.querySelector(
            'button[onclick="finalizarVenda()"]'
        );

    if (botaoFinalizar) {
        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = "Registrando venda...";
    }

    mensagem.textContent =
        "Aguarde: registrando venda no banco...";

    try {
        // Verifica se o funcionário está autenticado
        const { data: usuario, error: erroUsuario } =
            await supabaseClient.auth.getUser();

        if (erroUsuario || !usuario.user) {
            throw new Error(
                "Sessão expirada. Faça login novamente."
            );
        }

        // Envia a venda para a função do PostgreSQL
        const { data: idVenda, error: erroVenda } =
            await supabaseClient.rpc("registrar_venda", {
                p_quantidade5: quantidade5,
                p_quantidade10: quantidade10,
                p_vouchers: venda.vouchers,
                p_pagamento: pagamento
            });

        if (erroVenda) {
            throw erroVenda;
        }

        // Venda confirmada pelo banco
        quantidade5 = 0;
        quantidade10 = 0;

        document.getElementById("quantidadeVouchers")
            .value = 0;

        document.getElementById("pagamento")
            .value = "Pix";

        atualizarCarrinho();

        mensagem.textContent =
            "Venda nº " + idVenda +
            " registrada com sucesso!";

        alert(
            "Venda registrada com sucesso!\n\n" +
            "Número da venda: " + idVenda + "\n" +
            "Valor recebido: R$ " +
            formatarMoeda(venda.totalPagar)
        );

    } catch (erro) {
        console.error("Erro ao registrar venda:", erro);

        mensagem.textContent =
            "Não foi possível registrar a venda: " +
            erro.message;

        alert(
            "A venda não foi confirmada.\n\n" +
            erro.message +
            "\n\nConfira o sistema antes de tentar novamente."
        );

    } finally {
        vendaEmAndamento = false;

        if (botaoFinalizar) {
            botaoFinalizar.disabled = false;
            botaoFinalizar.textContent = "Finalizar venda";
        }
    }
}

// Exibe o carrinho inicial
atualizarCarrinho();
