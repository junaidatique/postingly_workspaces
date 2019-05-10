const formattedStore = (store) => {
  return {
    id: store.id,
    userId: store.userId,
    partner: store.partner,
    partnerId: store.partnerId,
    partnerPlan: store.partnerPlan,
    title: store.title,
    storeUrl: store.storeUrl,
    partnerSpecificUrl: store.partnerSpecificUrl,
    partnerCreatedAt: store.partnerCreatedAt,
    partnerUpdatedAt: store.partnerUpdatedAt,
    partnerToken: store.partnerToken,
    timezone: store.timezone,
    moneyFormat: store.moneyFormat,
    moneyWithCurrencyFormat: store.moneyWithCurrencyFormat,
    numberOfProducts: store.numberOfProducts,
    noOfActiveProducts: store.noOfActiveProducts,
    numberOfScheduledPosts: store.numberOfScheduledPosts,
    numberOfPosted: store.numberOfPosted,
    productsLastUpdated: store.productsLastUpdated,
    isCharged: store.isCharged,
    chargedMethod: store.chargedMethod,
    chargeId: store.chargeId,
    chargeDate: store.chargeDate,
    isUninstalled: store.isUninstalled,
  }
}

exports.formattedStore = formattedStore