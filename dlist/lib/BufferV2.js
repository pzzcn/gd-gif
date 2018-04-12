class BufferV2{
    constructor(length){
        this.length=length;
        this.buf=Buffer.alloc(length);

        this.index=0;
    }
    appendHexStr(hexStr){
        const l=hexStr.length/2;
        this.buf.write(hexStr,this.index,l,"hex");
        this.index=this.index+l;
        return this;
    }
    appendInt(n){
        this.buf.writeInt16LE(n,this.index,1);
        this.index++;
        return this;
    }
    appendStr(str){
        this.buf.write(str,this.index,str.length,"ascii");
        this.index=this.index+str.length;
        return this;
    }
    clear(){
        this.buf=null;
        this.buf=Buffer.alloc(this.length);
        return this;
    }
    getBuffer(){
        return this.buf;
    }
}
module.exports=BufferV2;