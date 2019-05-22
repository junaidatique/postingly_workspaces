const formattedStore = (store) => {
  return {
    ...store._doc,
    id: store._id,
    partnerCreatedAt: store.partnerCreatedAt,
    partnerUpdatedAt: store.partnerUpdatedAt,
    productsLastUpdated: store.productsLastUpdated,
    chargeDate: store.chargeDate
  }
}

exports.formattedStore = formattedStore