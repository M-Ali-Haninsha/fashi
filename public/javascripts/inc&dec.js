// Cart page: + / - buttons. The quantity only changes once the server has
// accepted it, and + is disabled when there is no more stock.
function updateValue(operation, proId) {
    const quantityEl = document.querySelector(`.quantity[data-id="${proId}"]`);
    const plus = document.querySelector(`[data-plus="${proId}"]`);
    const minus = document.querySelector(`[data-minus="${proId}"]`);
    const message = document.getElementById(`${proId}y`);

    const current = parseInt(quantityEl.innerText, 10);
    const next = operation === 'increment' ? current + 1 : current - 1;
    if (next < 1) return;

    plus.disabled = true;
    minus.disabled = true;

    $.ajax({
        method: 'put',
        url: '/updateCart',
        data: { id: proId, quantity: next },
        success: (response) => {
            const stock = response.stock;
            setCartCount(response.count);
            if (response.status === true) {
                quantityEl.innerText = next;
                $(`#${proId}k`).html('₹' + response.data.price);
                $('#total').html('<strong>' + response.data.total + '</strong>');
                message.textContent = next >= stock ? `Only ${stock} in stock` : '';
                plus.disabled = next >= stock;
                minus.disabled = next <= 1;
            } else {
                message.textContent = response.data;
                plus.disabled = true;
                minus.disabled = current <= 1;
            }
        },
        error: (xhr) => {
            message.textContent = xhr.responseJSON?.msg || 'Could not update the quantity';
            plus.disabled = false;
            minus.disabled = current <= 1;
        },
    });
}
