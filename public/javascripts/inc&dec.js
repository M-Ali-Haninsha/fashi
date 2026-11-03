// const { response } = require("../../app");

function updateValue(operation, proId, stock){
    const Quanty = document.querySelector(`.quantity[data-id="${proId}"] `) 
    let quantityu = parseInt(Quanty.innerText); 
    const quantityies = document.getElementById(`${proId}`)
    if(operation === 'increment'){
        quantityu++
    }else if(operation === 'decrement' && quantityu>1){
        quantityu--
    }
    Quanty.innerText=quantityu
    
    ajaxConnection(proId, quantityu)

}


function ajaxConnection(id, quantity){

    $.ajax({
        method:'put',
        url:'/updateCart',
        data:{id, quantity},
        success:(response)=>{
            if(response.status==true){
                $(`#${id}k`).html(response.data.price)
                $('#total').html(response.data.total)
                $(`#${id}y`).html(response.data.stocks)
            }else if(response.status=="out"){
                $(`#${id}y`).html(response.data)
            }
        }
    })
}