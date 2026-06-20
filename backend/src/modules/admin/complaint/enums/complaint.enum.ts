export enum ComplaintStatus {
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED',
    REJECTED = 'REJECTED'
}

export enum ComplaintAction {
    BAN = 'BAN',
    PERMA_BAN = 'PERMA_BAN',
    WARN = 'WARN',
    REJECT = 'REJECT'
}

export enum ComplaintReason {
    INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
    INSULT = 'INSULT',
    SPAM = 'SPAM'
}