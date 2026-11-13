
const paginaCaixa =
    document.getElementById("paginaCaixa");

const formCaixa =
    document.getElementById("formCaixa");

const mensagemCaixa =
    document.getElementById("mensagemCaixa");

const botaoCaixa =
    document.getElementById("botaoCaixa");

// Verifica se o funcionário está conectado
async function iniciarCaixa() {
    try {
        const { data, error } =
            await supabaseClient.auth.getUser();

        if (error || !data.user) {
            window.location.href = "index.html";
            return;
        }

        paginaCaixa.style.display = "block";

    } catch (erro) {
        console.error(erro);
        window.location.href = "index.html";
    }
}

// Registra uma movimentação
formCaixa.addEventListener(
    "submit",
    async function(evento) {

        evento.preventDefault();

        const tipo =
            document.getElementById(
                "tipoMovimentacao"
            ).value;

        const descricao =
            document.getElementById(
                "descricaoMovimentacao"
            ).value.trim();

        const valor = Number(
            document.getElementById(
                "valorMovimentacao"
            ).value
        );

        const tiposValidos = [
            "Saldo inicial",
            "Despesa",
            "Retirada"
        ];

        const centavos = Math.round(valor * 100);

        if (!tiposValidos.includes(tipo)) {
            mensagemCaixa.textContent =
                "Tipo de movimentação inválido.";
            return;
        }

        if (
            descricao.length === 0 ||
            descricao.length > 200
        ) {
            mensagemCaixa.textContent =
                "Informe uma descrição válida.";
            return;
        }

        if (
            !Number.isFinite(valor) ||
            valor <= 0 ||
            valor > 99999999.99 ||
            Math.abs(valor * 100 - centavos) > 0.000001
        ) {
            mensagemCaixa.textContent =
                "Informe um valor válido.";
            return;
        }

        const valorConfirmado = (centavos / 100).toFixed(2);

        const confirmar = window.confirm(
            "Confirmar movimentação?\n\n" +
            "Tipo: " + tipo + "\n" +
            "Descrição: " + descricao + "\n" +
            "Valor: R$ " +
            valor.toFixed(2).replace(".", ",")
        );

        if (!confirmar) return;

        botaoCaixa.disabled = true;

        mensagemCaixa.textContent =
            "Registrando movimentação...";

        try {
            const { data: id, error } =
                await supabaseClient.rpc(
                    "registrar_movimentacao_caixa",
                    {
                        p_tipo: tipo,
                        p_descricao: descricao,
                        p_valor: valorConfirmado
                    }
                );

            if (error) throw error;

            mensagemCaixa.textContent =
                "Movimentação nº " + id +
                " registrada com sucesso!";

            formCaixa.reset();

        } catch (erro) {
            console.error(erro);

            mensagemCaixa.textContent =
                "Erro: " + erro.message;

            alert(
                "Não foi possível confirmar a movimentação.\n" +
                "Confira os registros antes de tentar novamente."
            );

        } finally {
            botaoCaixa.disabled = false;
        }
    }
);

iniciarCaixa();
