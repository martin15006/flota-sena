import './Footer.css';

function Footer() {
    return (
        <footer className='footer'>
            <div className='footer-logos'>
                <img src='/logoverde.png' alt='SENA' className='footer-logo footer-logo-sena' />
                <div className='footer-separador'></div>
                <img src='/logogidis.png' ald='SENA' className='footer-logo footer-logo-sena1' />
                <div className='footer-separador'></div>
                <img src='/ici.png' alt='Centro de Industria y de la Construcción' className='footer-logo' />
                <div className='footer-separador'></div>
                <img src='/sennova.png' alt='SENNOVA' className='footer-logo' />
            </div>
            <p className='footer-texto'>
                Proyecto ID+I · SENA 
            </p>
        </footer>
    );
}

export default Footer;